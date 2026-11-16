import { CheckCircle2, Timer } from 'lucide-react';
import { getEisenhowerQuadrant, PRIORITY_LABELS, STATUS_LABELS } from '../lib/taskParser';
import type { TaskItem } from '../types/task';

interface EisenhowerMatrixProps {
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onCompleteTask: (task: TaskItem) => Promise<void>;
  onStartFocus: (task: TaskItem) => void;
}

const QUADRANTS = [
  {
    id: 'do_first' as const,
    title: '01. Do First',
    subtitle: 'Urgent & High Impact — Execute immediately',
    headerClass: 'text-red-600 dark:text-red-400',
  },
  {
    id: 'schedule' as const,
    title: '02. Schedule',
    subtitle: 'Important, Not Urgent — Block dedicated focus time',
    headerClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'delegate' as const,
    title: '03. Quick Wins / Triage',
    subtitle: 'Time-Sensitive, Moderate Impact — Batch or delegate',
    headerClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'backlog' as const,
    title: '04. Backlog / Defer',
    subtitle: 'Low Urgency — Revisit during sprint planning',
    headerClass: 'text-slate-600 dark:text-slate-400',
  },
];

export function EisenhowerMatrix({
  tasks,
  onSelectTask,
  onCompleteTask,
  onStartFocus,
}: EisenhowerMatrixProps) {
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {QUADRANTS.map((quad) => {
        const items = activeTasks.filter((t) => getEisenhowerQuadrant(t) === quad.id);

        return (
          <section
            key={quad.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4 min-h-[260px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className={`text-sm font-bold ${quad.headerClass}`}>{quad.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{quad.subtitle}</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 dark:text-slate-500">
                No active tasks in this quadrant.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {items.map((task) => (
                  <div
                    key={task.id}
                    className="py-2.5 flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left truncate block w-full"
                      >
                        {task.title}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{PRIORITY_LABELS[task.priority]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{STATUS_LABELS[task.status]}</span>
                        {task.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{task.dueDate}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onStartFocus(task)}
                        title="Focus on task"
                        aria-label={`Focus on ${task.title}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Timer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCompleteTask(task)}
                        title="Mark Done"
                        aria-label={`Complete ${task.title}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
