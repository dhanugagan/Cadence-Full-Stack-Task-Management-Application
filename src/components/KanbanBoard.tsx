import { useState } from 'react';
import { Clock, Plus, Timer } from 'lucide-react';
import {
  formatMinutes,
  isTaskDueSoon,
  isTaskOverdue,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../lib/taskParser';
import type { Project, TaskItem, TaskPriority, TaskStatus } from '../types/task';

interface KanbanBoardProps {
  tasks: TaskItem[];
  projects: Project[];
  onSelectTask: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, nextStatus: TaskStatus) => Promise<void>;
  onStartFocus: (task: TaskItem) => void;
  onCreateInColumn: (status: TaskStatus) => void;
}

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

const PRIORITY_TEXT_CLASS: Record<TaskPriority, string> = {
  urgent: 'text-red-600 dark:text-red-400 font-semibold',
  high: 'text-amber-600 dark:text-amber-400 font-medium',
  medium: 'text-blue-600 dark:text-blue-400 font-medium',
  low: 'text-slate-500 dark:text-slate-400',
};

export function KanbanBoard({
  tasks,
  projects,
  onSelectTask,
  onStatusChange,
  onStartFocus,
  onCreateInColumn,
}: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const handleDrop = async (targetStatus: TaskStatus) => {
    setDragOverColumn(null);
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (task && task.status !== targetStatus) {
      await onStatusChange(task, targetStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
      {COLUMNS.map((colStatus) => {
        const colTasks = tasks.filter((t) => t.status === colStatus);
        const isOver = dragOverColumn === colStatus;

        return (
          <section
            key={colStatus}
            aria-label={STATUS_LABELS[colStatus]}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(colStatus);
            }}
            onDragLeave={() => setDragOverColumn((prev) => (prev === colStatus ? null : prev))}
            onDrop={() => handleDrop(colStatus)}
            className={`rounded-xl border p-3 transition-colors min-h-[320px] flex flex-col gap-3 ${
              isOver
                ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {STATUS_LABELS[colStatus]}
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
                  {colTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onCreateInColumn(colStatus)}
                aria-label={`Add task to ${STATUS_LABELS[colStatus]}`}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards */}
            <div className="space-y-2.5 flex-1">
              {colTasks.length === 0 ? (
                <div className="py-8 px-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400 dark:text-slate-500">No tasks</p>
                </div>
              ) : (
                colTasks.map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  const dueSoon = isTaskDueSoon(task.dueDate, task.status);
                  const projName = projectMap.get(task.projectId) || 'Workspace';

                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverColumn(null);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-3.5 space-y-2.5 cursor-grab active:cursor-grabbing transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="w-full text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 leading-snug transition-colors"
                      >
                        {task.title}
                      </button>

                      {/* Unboxed Metadata Row */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className={PRIORITY_TEXT_CLASS[task.priority]}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[110px]">{projName}</span>
                        {task.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-mono tabular-nums ${
                                overdue
                                  ? 'text-red-600 dark:text-red-400 font-medium'
                                  : dueSoon
                                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                                  : ''
                              }`}
                            >
                              {overdue ? `Overdue ${task.dueDate}` : task.dueDate}
                            </span>
                          </>
                        )}
                      </div>

                      {task.tags.length > 0 && (
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                          {task.tags.map((t) => `#${t}`).join(' ')}
                        </p>
                      )}

                      {/* Footer Controls */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatMinutes(task.loggedMinutes)}/{formatMinutes(task.estimatedMinutes)}
                          </span>
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onStartFocus(task)}
                            title="Start Focus Timer"
                            aria-label={`Focus on ${task.title}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Timer className="w-3.5 h-3.5" />
                          </button>

                          <select
                            aria-label={`Change status of ${task.title}`}
                            value={task.status}
                            onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
                            className="text-[11px] font-medium px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            {COLUMNS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
