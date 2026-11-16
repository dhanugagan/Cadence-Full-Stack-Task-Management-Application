import { useEffect, useState, type FormEvent } from 'react';
import { Archive, CheckSquare, Plus, Square, Timer, Trash2, X } from 'lucide-react';
import { formatMinutes, PRIORITY_LABELS, STATUS_LABELS } from '../lib/taskParser';
import {
  LIMITS,
  type Project,
  type SubtaskItem,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from '../types/task';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  task: TaskItem | null;
  initialStatus?: TaskStatus;
  defaultProjectId: string;
  projects: Project[];
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: string;
    dueDate: string;
    estimatedMinutes: number;
    tags: string[];
  }) => Promise<void>;
  onUpdate: (
    taskId: string,
    data: Partial<
      Pick<
        TaskItem,
        'title' | 'description' | 'status' | 'priority' | 'projectId' | 'dueDate' | 'estimatedMinutes' | 'tags'
      >
    >
  ) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onStartFocus: (task: TaskItem) => void;
  subscribeSubtasks: (taskId: string, cb: (items: SubtaskItem[]) => void) => () => void;
  onAddSubtask: (taskId: string, title: string, order: number) => Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

export function TaskDetailDrawer({
  isOpen,
  task,
  initialStatus = 'todo',
  defaultProjectId,
  projects,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onStartFocus,
  subscribeSubtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskDetailDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setProjectId(task.projectId);
      setDueDate(task.dueDate || '');
      setEstimatedMinutes(task.estimatedMinutes || 0);
      setTagsInput((task.tags || []).join(', '));
    } else {
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setPriority('medium');
      setProjectId(defaultProjectId || projects[0]?.id || '');
      setDueDate('');
      setEstimatedMinutes(30);
      setTagsInput('');
      setSubtasks([]);
    }
  }, [isOpen, task, initialStatus, defaultProjectId, projects]);

  useEffect(() => {
    if (!isOpen || !task) {
      setSubtasks([]);
      return;
    }
    const unsub = subscribeSubtasks(task.id, setSubtasks);
    return () => unsub();
  }, [isOpen, task, subscribeSubtasks]);

  if (!isOpen) return null;

  const isArchived = task?.status === 'archived';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || saving || isArchived) return;
    setSaving(true);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, '').toLowerCase().slice(0, LIMITS.TAG_MAX))
      .filter(Boolean)
      .slice(0, LIMITS.TAGS_MAX_COUNT);

    try {
      if (task) {
        await onUpdate(task.id, {
          title,
          description,
          status,
          priority,
          projectId,
          dueDate,
          estimatedMinutes: Number(estimatedMinutes) || 0,
          tags: parsedTags,
        });
      } else {
        await onCreate({
          title,
          description,
          status,
          priority,
          projectId,
          dueDate,
          estimatedMinutes: Number(estimatedMinutes) || 0,
          tags: parsedTags,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtask.trim() || isArchived) return;
    const text = newSubtask.trim();
    setNewSubtask('');
    await onAddSubtask(task.id, text, subtasks.length);
  };

  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-950/50" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {task ? 'Task Details' : 'Create New Task'}
            </h2>
            {task && (
              <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Logged: {formatMinutes(task.loggedMinutes)} · Est: {formatMinutes(task.estimatedMinutes)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task && !isArchived && (
              <button
                type="button"
                onClick={() => {
                  onStartFocus(task);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Timer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Focus</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task drawer"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isArchived && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300">
              This task is archived and locked against edits.
            </div>
          )}

          <form id="task-detail-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="task-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <input
                id="task-title"
                type="text"
                required
                disabled={isArchived}
                maxLength={LIMITS.TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be accomplished?"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="task-project" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Project
                </label>
                <select
                  id="task-project"
                  disabled={isArchived}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="task-status" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  id="task-status"
                  disabled={isArchived}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(['backlog', 'todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="task-priority" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  id="task-priority"
                  disabled={isArchived}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="task-due" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Due Date
                </label>
                <input
                  id="task-due"
                  type="date"
                  disabled={isArchived}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="task-estimate" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estimated Minutes
                </label>
                <input
                  id="task-estimate"
                  type="number"
                  min={0}
                  max={LIMITS.ESTIMATE_MAX}
                  step={5}
                  disabled={isArchived}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="task-tags" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tags (comma-separated, max {LIMITS.TAGS_MAX_COUNT})
                </label>
                <input
                  id="task-tags"
                  type="text"
                  disabled={isArchived}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="backend, api, sprint"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Description &amp; Acceptance Criteria
              </label>
              <textarea
                id="task-desc"
                rows={4}
                disabled={isArchived}
                maxLength={LIMITS.DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add technical context, links, or notes..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </form>

          {/* Real-Time Subtasks Checklist */}
          {task && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subtask Checklist
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {completedSubtasks}/{subtasks.length} done
                </span>
              </div>

              {subtasks.length > 0 && (
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{
                      width: `${Math.round((completedSubtasks / subtasks.length) * 100)}%`,
                    }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <button
                      type="button"
                      disabled={isArchived}
                      onClick={() => onToggleSubtask(task.id, sub.id, !sub.completed)}
                      className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                    >
                      {sub.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`text-sm truncate ${
                          sub.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </button>

                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => onDeleteSubtask(task.id, sub.id)}
                        aria-label={`Delete subtask ${sub.title}`}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isArchived && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    maxLength={LIMITS.SUBTASK_TITLE_MAX}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Add a checklist step..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newSubtask.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-slate-950/60">
          {task ? (
            <div className="flex items-center gap-2">
              {!isArchived && (
                <button
                  type="button"
                  onClick={async () => {
                    await onUpdate(task.id, { status: 'archived' });
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  await onDelete(task.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            {!isArchived && (
              <button
                type="submit"
                form="task-detail-form"
                disabled={saving || !title.trim() || !projectId}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white whitespace-nowrap shrink-0"
              >
                {saving ? 'Saving...' : task ? 'Save Task' : 'Create Task'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
