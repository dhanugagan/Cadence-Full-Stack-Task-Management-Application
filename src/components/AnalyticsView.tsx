import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Users } from 'lucide-react';
import { formatMinutes, PRIORITY_LABELS, STATUS_LABELS } from '../lib/taskParser';
import type {
  ActivityEntry,
  FocusSession,
  PresenceSession,
  ServerAnalysisSummary,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../types/task';

interface AnalyticsViewProps {
  tasks: TaskItem[];
  focusSessions: FocusSession[];
  activity: ActivityEntry[];
  presence: PresenceSession[];
}

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

export function AnalyticsView({
  tasks,
  focusSessions,
  activity,
  presence,
}: AnalyticsViewProps) {
  const [analysis, setAnalysis] = useState<ServerAnalysisSummary | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const runServerAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/tasks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      if (res.ok) {
        const data: ServerAnalysisSummary = await res.json();
        setAnalysis(data);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    runServerAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, tasks.filter((t) => t.status === 'done').length]);

  const totalTasks = Math.max(tasks.length, 1);
  const totalFocusMinutes = focusSessions
    .filter((s) => s.mode === 'focus')
    .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Completion Rate</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {analysis ? `${analysis.summary.completionRate}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {analysis ? `${analysis.summary.completedCount} of ${analysis.summary.totalTasks} tasks` : 'Computing...'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Overdue Items</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
            {analysis ? analysis.summary.overdueCount : 0}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {analysis ? `${analysis.summary.activeCount} active tasks` : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Deep Focus Logged</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
            {formatMinutes(totalFocusMinutes)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {focusSessions.filter((s) => s.mode === 'focus').length} Pomodoro sessions
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active WebSocket Tabs</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {presence.length || 1}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time room connected
          </p>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Workflow Status Distribution
            </h2>
            <button
              type="button"
              onClick={runServerAnalysis}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>Sync API</span>
            </button>
          </div>

          <div className="space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = tasks.filter((t) => t.status === status).length;
              const pct = Math.round((count / totalTasks) * 100);
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        status === 'done'
                          ? 'bg-emerald-600'
                          : status === 'in_progress'
                          ? 'bg-blue-600'
                          : status === 'review'
                          ? 'bg-amber-500'
                          : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Priority Breakdown
          </h2>

          <div className="space-y-3">
            {PRIORITY_ORDER.map((priority) => {
              const count = tasks.filter((t) => t.priority === priority).length;
              const pct = Math.round((count / totalTasks) * 100);
              return (
                <div key={priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {PRIORITY_LABELS[priority]}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        priority === 'urgent'
                          ? 'bg-red-600'
                          : priority === 'high'
                          ? 'bg-amber-500'
                          : priority === 'medium'
                          ? 'bg-blue-600'
                          : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Live WebSocket Activity Feed & Connected Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Live WebSocket Workspace Activity</span>
          </h2>

          {activity.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6">
              Create, update, or complete a task to stream real-time events via the Express
              WebSocket server.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-64 overflow-y-auto">
              {activity.map((entry) => (
                <div key={entry.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200">
                      <span className="font-semibold">{entry.actorName}</span>{' '}
                      <span className="text-slate-500 dark:text-slate-400">{entry.action}</span>{' '}
                      <span className="font-medium">{entry.targetTitle}</span>
                    </p>
                    {entry.detail && (
                      <p className="text-slate-500 dark:text-slate-400">{entry.detail}</p>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Connected Sessions</span>
          </h2>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {presence.map((session) => (
              <div key={session.clientId} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {session.userName}
                </span>
                <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
                  {session.clientId.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
