import {
  BarChart3,
  CalendarDays,
  Columns3,
  FolderPlus,
  Grid2x2,
  ListChecks,
  LogOut,
  Pencil,
  PlayCircle,
  Timer,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { SocketStatus } from '../hooks/useWebSocketSync';
import type { PresenceSession, Project, UserProfile, WorkspaceView } from '../types/task';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  projects: Project[];
  selectedProjectId: string | 'all';
  onSelectProject: (id: string | 'all') => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  taskCountsByProject: Record<string, number>;
  totalActiveTasks: number;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  socketStatus: SocketStatus;
  presence: PresenceSession[];
  onOpenFocusTimer: () => void;
  onOpenTutorial: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string; icon: typeof Columns3 }> = [
  { id: 'board', label: 'Kanban Board', icon: Columns3 },
  { id: 'list', label: 'Task Table', icon: ListChecks },
  { id: 'matrix', label: 'Priority Matrix', icon: Grid2x2 },
  { id: 'calendar', label: 'Schedule', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics & Sync', icon: BarChart3 },
];

const ACCENT_DOT: Record<string, string> = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-600',
  rose: 'bg-rose-600',
  slate: 'bg-slate-500',
};

export function Sidebar({
  isOpenMobile,
  onCloseMobile,
  activeView,
  onSelectView,
  projects,
  selectedProjectId,
  onSelectProject,
  onNewProject,
  onEditProject,
  onDeleteProject,
  taskCountsByProject,
  totalActiveTasks,
  userProfile,
  onSignOut,
  socketStatus,
  presence,
  onOpenFocusTimer,
  onOpenTutorial,
}: SidebarProps) {
  const content = (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <span className="text-base font-bold tracking-tight font-display text-slate-900 dark:text-slate-100 whitespace-nowrap">
          Cadence
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav aria-label="Workspace views" className="space-y-1">
          <p className="px-2.5 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            Views
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Projects */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2.5 pb-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              Projects
            </p>
            <button
              type="button"
              onClick={onNewProject}
              aria-label="Create project"
              className="p-1 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectProject('all');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors min-h-[40px] ${
              selectedProjectId === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="truncate">All Workspaces</span>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {totalActiveTasks}
            </span>
          </button>

          {projects.map((project) => {
            const selected = selectedProjectId === project.id;
            const count = taskCountsByProject[project.id] || 0;
            return (
              <div
                key={project.id}
                className={`group flex items-center justify-between rounded-lg transition-colors min-h-[40px] ${
                  selected
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectProject(project.id);
                    onCloseMobile();
                  }}
                  className="flex-1 flex items-center gap-2.5 px-2.5 py-2 text-sm text-left min-w-0"
                >
                  <span
                    className={`w-2 h-2 rounded-xs shrink-0 ${
                      ACCENT_DOT[project.accent] || 'bg-blue-600'
                    }`}
                  />
                  <span className="truncate">{project.name}</span>
                </button>
                <div className="flex items-center gap-1 pr-2 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 group-hover:hidden">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditProject(project)}
                    aria-label={`Edit ${project.name}`}
                    className="hidden group-hover:inline-flex p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteProject(project)}
                      aria-label={`Delete ${project.name}`}
                      className="hidden group-hover:inline-flex p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tools */}
        <div className="space-y-1">
          <p className="px-2.5 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            Tools
          </p>
          <button
            type="button"
            onClick={() => {
              onOpenFocusTimer();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-colors min-h-[40px]"
          >
            <Timer className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="truncate">Focus Timer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenTutorial();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-colors min-h-[40px]"
          >
            <PlayCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">Watch Task Tutorial</span>
          </button>
        </div>
      </div>

      {/* Live WebSocket Sync & User Account Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            {socketStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>
              {socketStatus === 'connected'
                ? 'Live Sync Active'
                : socketStatus === 'reconnecting'
                ? 'Reconnecting'
                : 'Connecting'}
            </span>
          </span>
          <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
            {presence.length || 1} tab{presence.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                {(userProfile?.displayName || 'M').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                {userProfile?.displayName || 'Workspace Member'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {userProfile?.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">{content}</aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
