import { useMemo, useState } from 'react';
import { ArrowUpDown, Download, Timer, Trash2 } from 'lucide-react';
import {
  formatMinutes,
  isTaskOverdue,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../lib/taskParser';
import type { Project, TaskItem, TaskPriority, TaskStatus } from '../types/task';

interface TaskTableViewProps {
  tasks: TaskItem[];
  projects: Project[];
  onSelectTask: (task: TaskItem) => void;
  onUpdateTask: (
    taskId: string,
    patch: Partial<Pick<TaskItem, 'status' | 'priority'>>
  ) => Promise<void>;
  onBulkUpdate: (ids: string[], patch: Partial<Pick<TaskItem, 'status' | 'priority'>>) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onStartFocus: (task: TaskItem) => void;
  onExport: (format: 'csv' | 'json' | 'markdown') => void;
}

type SortKey = 'title' | 'status' | 'priority' | 'dueDate' | 'estimatedMinutes';

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function TaskTableView({
  tasks,
  projects,
  onSelectTask,
  onUpdateTask,
  onBulkUpdate,
  onBulkDelete,
  onStartFocus,
  onExport,
}: TaskTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'priority') {
        cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      } else if (sortKey === 'estimatedMinutes') {
        cmp = (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
      } else if (sortKey === 'dueDate') {
        const da = a.dueDate || '9999-12-31';
        const db = b.dueDate || '9999-12-31';
        cmp = da.localeCompare(db);
      } else {
        cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [tasks, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const allSelected = sortedTasks.length > 0 && selectedIds.length === sortedTasks.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedTasks.map((t) => t.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            {sortedTasks.length} task{sortedTasks.length === 1 ? '' : 's'}
          </span>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={async () => {
                  await onBulkUpdate(selectedIds, { status: 'done' });
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                Mark Done
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onBulkUpdate(selectedIds, { priority: 'urgent' });
                  setSelectedIds([]);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Set Urgent
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onExport('csv')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => onExport('markdown')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => onExport('json')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all tasks"
                  className="rounded border-slate-300 dark:border-slate-700"
                />
              </th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort('title')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <span>Task Title</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort('status')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort('priority')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 hidden md:table-cell">Project</th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort('dueDate')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <span>Due Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-right hidden sm:table-cell">
                <button
                  type="button"
                  onClick={() => toggleSort('estimatedMinutes')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200 ml-auto"
                >
                  <span>Logged / Est</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">Focus</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  No tasks match the current filter. Use the quick-add bar above to create one.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const overdue = isTaskOverdue(task.dueDate, task.status);
                const checked = selectedIds.includes(task.id);
                return (
                  <tr
                    key={task.id}
                    className={`h-11 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      checked ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="px-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(task.id)}
                        aria-label={`Select ${task.title}`}
                        className="rounded border-slate-300 dark:border-slate-700"
                      />
                    </td>
                    <td className="px-3 max-w-xs">
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block w-full"
                      >
                        {task.title}
                      </button>
                    </td>
                    <td className="px-3">
                      <select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(e) =>
                          onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                        }
                        className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200"
                      >
                        {(['backlog', 'todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map(
                          (s) => (
                            <option key={s} value={s} className="bg-white dark:bg-slate-900">
                              {STATUS_LABELS[s]}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="px-3">
                      <select
                        aria-label={`Priority for ${task.title}`}
                        value={task.priority}
                        onChange={(e) =>
                          onUpdateTask(task.id, { priority: e.target.value as TaskPriority })
                        }
                        className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200"
                      >
                        {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                          <option key={p} value={p} className="bg-white dark:bg-slate-900">
                            {PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell truncate max-w-[140px]">
                      {projectMap.get(task.projectId) || 'Workspace'}
                    </td>
                    <td className="px-3 text-xs font-mono tabular-nums">
                      {task.dueDate ? (
                        <span
                          className={
                            overdue
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {overdue ? `Overdue · ${task.dueDate}` : task.dueDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 text-right text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                      {formatMinutes(task.loggedMinutes)} / {formatMinutes(task.estimatedMinutes)}
                    </td>
                    <td className="px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onStartFocus(task)}
                        aria-label={`Start focus timer for ${task.title}`}
                        className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Timer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
