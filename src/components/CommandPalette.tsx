import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Columns3,
  Download,
  Grid2x2,
  ListChecks,
  Moon,
  PlayCircle,
  Plus,
  Search,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import type { TaskItem, WorkspaceView } from '../types/task';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  isDark: boolean;
  onToggleTheme: () => void;
  onSelectView: (view: WorkspaceView) => void;
  onCreateTask: () => void;
  onOpenFocusTimer: () => void;
  onOpenTutorial: () => void;
  onExportTasks: (format: 'csv' | 'json' | 'markdown') => void;
  onSelectTask: (task: TaskItem) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  tasks,
  isDark,
  onToggleTheme,
  onSelectView,
  onCreateTask,
  onOpenFocusTimer,
  onOpenTutorial,
  onExportTasks,
  onSelectTask,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const actions = useMemo(
    () => [
      { id: 'new-task', label: 'Create New Task', icon: Plus, run: onCreateTask },
      { id: 'view-board', label: 'Switch to Kanban Board', icon: Columns3, run: () => onSelectView('board') },
      { id: 'view-list', label: 'Switch to Task Table', icon: ListChecks, run: () => onSelectView('list') },
      { id: 'view-matrix', label: 'Switch to Priority Matrix', icon: Grid2x2, run: () => onSelectView('matrix') },
      { id: 'view-calendar', label: 'Switch to Schedule View', icon: CalendarDays, run: () => onSelectView('calendar') },
      { id: 'view-analytics', label: 'Switch to Analytics & Sync', icon: BarChart3, run: () => onSelectView('analytics') },
      { id: 'focus', label: 'Open Pomodoro Focus Timer', icon: Timer, run: onOpenFocusTimer },
      { id: 'tutorial', label: 'Watch Task Tutorial & Guide', icon: PlayCircle, run: onOpenTutorial },
      { id: 'export-csv', label: 'Export Tasks as CSV', icon: Download, run: () => onExportTasks('csv') },
      { id: 'export-md', label: 'Export Tasks as Markdown', icon: Download, run: () => onExportTasks('markdown') },
      { id: 'export-json', label: 'Export Tasks as JSON', icon: Download, run: () => onExportTasks('json') },
      {
        id: 'theme',
        label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: isDark ? Sun : Moon,
        run: onToggleTheme,
      },
    ],
    [
      isDark,
      onCreateTask,
      onExportTasks,
      onOpenFocusTimer,
      onOpenTutorial,
      onSelectView,
      onToggleTheme,
    ]
  );

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  const matchedTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 5);
  }, [tasks, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search tasks..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {matchedTasks.length > 0 && (
            <div className="space-y-1">
              <p className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Tasks
              </p>
              {matchedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    onSelectTask(task);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{task.title}</span>
                  <span className="text-xs text-slate-400 shrink-0">{task.status}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <p className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Commands
            </p>
            {filteredActions.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-500 text-center">
                No matching commands found.
              </p>
            ) : (
              filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.run();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>{action.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
