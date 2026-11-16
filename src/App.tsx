import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnalyticsView } from './components/AnalyticsView';
import { AuthScreen } from './components/AuthScreen';
import { CalendarTimelineView } from './components/CalendarTimelineView';
import { CommandPalette } from './components/CommandPalette';
import { EisenhowerMatrix } from './components/EisenhowerMatrix';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FocusTimerModal } from './components/FocusTimerModal';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectModal } from './components/ProjectModal';
import { QuickAddBar } from './components/QuickAddBar';
import { Sidebar } from './components/Sidebar';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { TaskTableView } from './components/TaskTableView';
import { TaskTutorialModal } from './components/TaskTutorialModal';
import { TopBar } from './components/TopBar';
import { useFirestoreWorkspace } from './hooks/useFirestoreWorkspace';
import { useWebSocketSync } from './hooks/useWebSocketSync';
import { formatMinutes, isTaskDueSoon, isTaskOverdue } from './lib/taskParser';
import type {
  FocusMode,
  Project,
  ProjectAccent,
  TaskItem,
  TaskPriority,
  TaskStatus,
  WorkspaceView,
} from './types/task';

const VIEW_LABELS: Record<WorkspaceView, string> = {
  board: 'Kanban Board',
  list: 'Task Table',
  matrix: 'Priority Matrix',
  calendar: 'Schedule',
  analytics: 'Analytics & Sync',
};

function WorkspaceApp() {
  const {
    authUser,
    userProfile,
    authLoading,
    authError,
    dataLoading,
    projects,
    tasks,
    focusSessions,
    signInWithGoogle,
    signOutUser,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    subscribeSubtasks,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    logFocusSession,
  } = useFirestoreWorkspace();

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = window.localStorage.getItem('cadence-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('cadence-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const [activeView, setActiveView] = useState<WorkspaceView>('board');
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Modals & Drawers
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [drawerInitialStatus, setDrawerInitialStatus] = useState<TaskStatus>('todo');
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const { socketStatus, presence, activity, emitTaskSync, emitFocusSync, logActivity } =
    useWebSocketSync(authUser?.uid ?? null, userProfile?.displayName || 'Workspace Member');

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const visibleTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.status === 'archived') return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesTag = (t.tags || []).some((tag) => `#${tag}`.includes(q) || tag.includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, priorityFilter, searchQuery]);

  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === 'done' || t.status === 'archived') continue;
      counts[t.projectId] = (counts[t.projectId] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  const totalActiveTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && t.status !== 'archived').length,
    [tasks]
  );

  const kpiStats = useMemo(() => {
    const nonArchived = visibleTasks;
    const active = nonArchived.filter((t) => t.status !== 'done').length;
    const inProgress = nonArchived.filter((t) => t.status === 'in_progress').length;
    const urgentOrOverdue = nonArchived.filter(
      (t) => isTaskOverdue(t.dueDate, t.status) || isTaskDueSoon(t.dueDate, t.status)
    ).length;
    const completed = nonArchived.filter((t) => t.status === 'done').length;
    const loggedMins = nonArchived.reduce((acc, t) => acc + (t.loggedMinutes || 0), 0);
    return { active, inProgress, urgentOrOverdue, completed, loggedMins };
  }, [visibleTasks]);

  const selectedProject =
    selectedProjectId === 'all' ? null : projects.find((p) => p.id === selectedProjectId) || null;

  const handleQuickCreate = async (payload: {
    title: string;
    priority: TaskPriority;
    tags: string[];
    estimatedMinutes: number;
    dueDate: string;
    projectId: string;
  }) => {
    const id = await createTask(payload);
    if (id) {
      emitTaskSync('created', id);
      logActivity('created task', payload.title, `Priority: ${payload.priority}`);
      showToast(`Added "${payload.title}"`);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'markdown') => {
    try {
      const res = await fetch('/api/tasks/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: visibleTasks, format }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `cadence-tasks.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${visibleTasks.length} tasks as ${format.toUpperCase()}`);
    } catch {
      showToast('Failed to export tasks.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Initializing Cadence workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <>
        <AuthScreen
          onSignIn={signInWithGoogle}
          authError={authError}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
          onOpenTutorial={() => setTutorialOpen(true)}
        />
        <TaskTutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      <Sidebar
        isOpenMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onNewProject={() => {
          setEditingProject(null);
          setProjectModalOpen(true);
        }}
        onEditProject={(project) => {
          setEditingProject(project);
          setProjectModalOpen(true);
        }}
        onDeleteProject={async (project) => {
          await deleteProject(project.id);
          if (selectedProjectId === project.id) setSelectedProjectId('all');
          logActivity('deleted project', project.name);
          showToast(`Deleted project "${project.name}"`);
        }}
        taskCountsByProject={taskCountsByProject}
        totalActiveTasks={totalActiveTasks}
        userProfile={userProfile}
        onSignOut={signOutUser}
        socketStatus={socketStatus}
        presence={presence}
        onOpenFocusTimer={() => {
          setFocusTaskId(null);
          setFocusModalOpen(true);
        }}
        onOpenTutorial={() => setTutorialOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          breadcrumbProjectName={selectedProject ? selectedProject.name : 'All Workspaces'}
          breadcrumbViewName={VIEW_LABELS[activeView]}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCommandPalette={() => setCommandOpen(true)}
          onCreateTaskClick={() => {
            setSelectedTask(null);
            setDrawerInitialStatus('todo');
            setDrawerOpen(true);
          }}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-5">
          {/* Quick-Add Bar + Compact Mobile Search */}
          <div className="space-y-3">
            <QuickAddBar
              projects={projects}
              selectedProjectId={selectedProjectId}
              onQuickCreate={handleQuickCreate}
            />

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Active Tasks</span>
                <span className="text-base font-bold font-mono tabular-nums">
                  {kpiStats.active}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">In Progress</span>
                <span className="text-base font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {kpiStats.inProgress}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Due Soon / Overdue</span>
                <span className="text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {kpiStats.urgentOrOverdue}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Focus Logged</span>
                <span className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMinutes(kpiStats.loggedMins)}
                </span>
              </div>
            </div>
          </div>

          {/* Data Loading Skeleton */}
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse space-y-3"
                >
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                  <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeView === 'board' && (
                <KanbanBoard
                  tasks={visibleTasks}
                  projects={projects}
                  onSelectTask={(task) => {
                    setSelectedTask(task);
                    setDrawerOpen(true);
                  }}
                  onStatusChange={async (task, nextStatus) => {
                    await updateTask(task.id, { status: nextStatus });
                    emitTaskSync('updated', task.id);
                    logActivity('moved task', task.title, `Status -> ${nextStatus}`);
                  }}
                  onStartFocus={(task) => {
                    setFocusTaskId(task.id);
                    setFocusModalOpen(true);
                  }}
                  onCreateInColumn={(status) => {
                    setSelectedTask(null);
                    setDrawerInitialStatus(status);
                    setDrawerOpen(true);
                  }}
                />
              )}

              {activeView === 'list' && (
                <TaskTableView
                  tasks={visibleTasks}
                  projects={projects}
                  onSelectTask={(task) => {
                    setSelectedTask(task);
                    setDrawerOpen(true);
                  }}
                  onUpdateTask={async (taskId, patch) => {
                    const target = tasks.find((t) => t.id === taskId);
                    await updateTask(taskId, patch);
                    emitTaskSync('updated', taskId);
                    if (target) {
                      logActivity('updated task', target.title);
                    }
                  }}
                  onBulkUpdate={async (ids, patch) => {
                    await bulkUpdateTasks(ids, patch);
                    showToast(`Updated ${ids.length} tasks`);
                  }}
                  onBulkDelete={async (ids) => {
                    await bulkDeleteTasks(ids);
                    showToast(`Deleted ${ids.length} tasks`);
                  }}
                  onStartFocus={(task) => {
                    setFocusTaskId(task.id);
                    setFocusModalOpen(true);
                  }}
                  onExport={handleExport}
                />
              )}

              {activeView === 'matrix' && (
                <EisenhowerMatrix
                  tasks={visibleTasks}
                  onSelectTask={(task) => {
                    setSelectedTask(task);
                    setDrawerOpen(true);
                  }}
                  onCompleteTask={async (task) => {
                    await updateTask(task.id, { status: 'done' });
                    emitTaskSync('updated', task.id);
                    logActivity('completed task', task.title);
                  }}
                  onStartFocus={(task) => {
                    setFocusTaskId(task.id);
                    setFocusModalOpen(true);
                  }}
                />
              )}

              {activeView === 'calendar' && (
                <CalendarTimelineView
                  tasks={visibleTasks}
                  onSelectTask={(task) => {
                    setSelectedTask(task);
                    setDrawerOpen(true);
                  }}
                  onToggleDone={async (task) => {
                    const nextStatus = task.status === 'done' ? 'todo' : 'done';
                    await updateTask(task.id, { status: nextStatus });
                    emitTaskSync('updated', task.id);
                    logActivity(
                      nextStatus === 'done' ? 'completed task' : 'reopened task',
                      task.title
                    );
                  }}
                />
              )}

              {activeView === 'analytics' && (
                <AnalyticsView
                  tasks={visibleTasks}
                  focusSessions={focusSessions}
                  activity={activity}
                  presence={presence}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <TaskDetailDrawer
        isOpen={drawerOpen}
        task={selectedTask}
        initialStatus={drawerInitialStatus}
        defaultProjectId={
          selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || ''
        }
        projects={projects}
        onClose={() => setDrawerOpen(false)}
        onCreate={async (data) => {
          const id = await createTask(data);
          if (id) {
            emitTaskSync('created', id);
            logActivity('created task', data.title, `Priority: ${data.priority}`);
            showToast(`Created "${data.title}"`);
          }
        }}
        onUpdate={async (taskId, data) => {
          await updateTask(taskId, data);
          emitTaskSync('updated', taskId);
          logActivity('updated task', data.title || selectedTask?.title || 'Task');
          showToast('Task updated');
        }}
        onDelete={async (taskId) => {
          const title = selectedTask?.title || 'Task';
          await deleteTask(taskId);
          emitTaskSync('deleted', taskId);
          logActivity('deleted task', title);
          showToast(`Deleted "${title}"`);
        }}
        onStartFocus={(task) => {
          setFocusTaskId(task.id);
          setFocusModalOpen(true);
        }}
        subscribeSubtasks={subscribeSubtasks}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        editingProject={editingProject}
        onClose={() => setProjectModalOpen(false)}
        onSave={async (data: { name: string; description: string; accent: ProjectAccent }) => {
          if (editingProject) {
            await updateProject(editingProject.id, data);
            logActivity('updated project', data.name);
            showToast(`Updated project "${data.name}"`);
          } else {
            const id = await createProject(data);
            if (id) setSelectedProjectId(id);
            logActivity('created project', data.name);
            showToast(`Created project "${data.name}"`);
          }
        }}
      />

      <FocusTimerModal
        isOpen={focusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        tasks={tasks}
        initialTaskId={focusTaskId}
        onCompleteSession={async (task, durationMinutes, mode: FocusMode) => {
          await logFocusSession(task.id, durationMinutes, mode, task.loggedMinutes || 0);
          logActivity(
            'logged focus session',
            task.title,
            `${durationMinutes}m (${mode.replace('_', ' ')})`
          );
          showToast(`Logged ${durationMinutes}m focus on "${task.title}"`);
        }}
        onEmitFocusSync={emitFocusSync}
      />

      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        tasks={visibleTasks}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onSelectView={setActiveView}
        onCreateTask={() => {
          setSelectedTask(null);
          setDrawerInitialStatus('todo');
          setDrawerOpen(true);
        }}
        onOpenFocusTimer={() => {
          setFocusTaskId(null);
          setFocusModalOpen(true);
        }}
        onOpenTutorial={() => setTutorialOpen(true)}
        onExportTasks={handleExport}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setDrawerOpen(true);
        }}
      />

      <TaskTutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 px-4 py-2.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-800 dark:border-slate-200 shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
    </ErrorBoundary>
  );
}
