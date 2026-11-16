import { useEffect, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { FocusMode, TaskItem } from '../types/task';

interface FocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  initialTaskId: string | null;
  onCompleteSession: (task: TaskItem, durationMinutes: number, mode: FocusMode) => Promise<void>;
  onEmitFocusSync: (payload: {
    taskId: string;
    taskTitle: string;
    mode: string;
    isRunning: boolean;
    secondsLeft: number;
  }) => void;
}

const MODE_SECONDS: Record<FocusMode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MODE_LABELS: Record<FocusMode, string> = {
  focus: 'Deep Focus (25m)',
  short_break: 'Short Break (5m)',
  long_break: 'Long Break (15m)',
};

export function FocusTimerModal({
  isOpen,
  onClose,
  tasks,
  initialTaskId,
  onCompleteSession,
  onEmitFocusSync,
}: FocusTimerModalProps) {
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [mode, setMode] = useState<FocusMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODE_SECONDS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
    } else if (!selectedTaskId && activeTasks.length > 0) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [initialTaskId, activeTasks, selectedTaskId]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || activeTasks[0] || null;

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isOpen || !selectedTask) return;
    onEmitFocusSync({
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
      mode,
      isRunning,
      secondsLeft,
    });
  }, [isOpen, isRunning, mode, selectedTask, secondsLeft, onEmitFocusSync]);

  if (!isOpen) return null;

  const switchMode = (nextMode: FocusMode) => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(MODE_SECONDS[nextMode]);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const handleLogNow = async () => {
    if (!selectedTask || logging) return;
    const elapsedMinutes = Math.max(
      1,
      Math.round((MODE_SECONDS[mode] - secondsLeft) / 60) || Math.round(MODE_SECONDS[mode] / 60)
    );
    setLogging(true);
    try {
      setIsRunning(false);
      await onCompleteSession(selectedTask, elapsedMinutes, mode);
      setSecondsLeft(MODE_SECONDS[mode]);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-timer-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="focus-timer-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Focus Timer
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close focus timer"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Segmented Mode Selector */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {(['focus', 'short_break', 'long_break'] as FocusMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m === 'focus' ? 'Focus 25m' : m === 'short_break' ? 'Break 5m' : 'Break 15m'}
              </button>
            ))}
          </div>

          {/* Countdown Readout */}
          <div className="text-center space-y-2 py-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {MODE_LABELS[mode]}
            </p>
            <div className="text-6xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
              {mins}:{secs}
            </div>
          </div>

          {/* Linked Task Selector */}
          <div className="space-y-1.5">
            <label htmlFor="focus-task-select" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Linked Task
            </label>
            <select
              id="focus-task-select"
              value={selectedTask?.id || ''}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              {activeTasks.length === 0 ? (
                <option value="">No active tasks available</option>
              ) : (
                activeTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              disabled={!selectedTask}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors whitespace-nowrap shrink-0"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Pause' : 'Start Session'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(MODE_SECONDS[mode]);
              }}
              aria-label="Reset timer"
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleLogNow}
              disabled={!selectedTask || logging}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{logging ? 'Logging...' : 'Log Session'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
