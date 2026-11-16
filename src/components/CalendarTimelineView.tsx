import { CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import {
  formatIsoDateOffset,
  formatMinutes,
  getTodayIso,
  isTaskOverdue,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../lib/taskParser';
import type { TaskItem } from '../types/task';

interface CalendarTimelineViewProps {
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onToggleDone: (task: TaskItem) => Promise<void>;
}

export function CalendarTimelineView({
  tasks,
  onSelectTask,
  onToggleDone,
}: CalendarTimelineViewProps) {
  const today = getTodayIso();
  const nextWeek = formatIsoDateOffset(7);

  const groups = [
    {
      id: 'overdue',
      title: 'Overdue',
      tone: 'text-red-600 dark:text-red-400',
      items: tasks.filter((t) => isTaskOverdue(t.dueDate, t.status)),
    },
    {
      id: 'today',
      title: `Due Today · ${today}`,
      tone: 'text-amber-600 dark:text-amber-400',
      items: tasks.filter((t) => t.dueDate === today && t.status !== 'done' && t.status !== 'archived'),
    },
    {
      id: 'upcoming',
      title: 'Next 7 Days',
      tone: 'text-blue-600 dark:text-blue-400',
      items: tasks
        .filter(
          (t) =>
            t.dueDate > today &&
            t.dueDate <= nextWeek &&
            t.status !== 'done' &&
            t.status !== 'archived'
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    },
    {
      id: 'later',
      title: 'Later & Unscheduled',
      tone: 'text-slate-700 dark:text-slate-300',
      items: tasks
        .filter(
          (t) =>
            (!t.dueDate || t.dueDate > nextWeek) &&
            t.status !== 'done' &&
            t.status !== 'archived'
        )
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    },
    {
      id: 'completed',
      title: 'Recently Completed',
      tone: 'text-emerald-600 dark:text-emerald-400',
      items: tasks.filter((t) => t.status === 'done'),
    },
  ];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.id}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className={`text-sm font-semibold flex items-center gap-2 ${group.tone}`}>
              <CalendarDays className="w-4 h-4" />
              <span>{group.title}</span>
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {group.items.length}
            </span>
          </div>

          {group.items.length === 0 ? (
            <p className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500">
              No tasks scheduled in this window.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {group.items.map((task) => (
                <div
                  key={task.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleDone(task)}
                      aria-label={
                        task.status === 'done'
                          ? `Reopen ${task.title}`
                          : `Complete ${task.title}`
                      }
                      className={`shrink-0 transition-colors ${
                        task.status === 'done'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-300 dark:text-slate-600 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className={`text-sm font-medium text-left truncate block w-full ${
                          task.status === 'done'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                      >
                        {task.title}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{PRIORITY_LABELS[task.priority]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{STATUS_LABELS[task.status]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatMinutes(task.estimatedMinutes)}</span>
                    </span>
                    <span>{task.dueDate || 'Unscheduled'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
