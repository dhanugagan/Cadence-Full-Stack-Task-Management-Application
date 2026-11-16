import { useMemo, useState, type FormEvent } from 'react';
import { CornerDownLeft, Sparkles } from 'lucide-react';
import { parseQuickTaskInput, PRIORITY_LABELS, formatMinutes } from '../lib/taskParser';
import type { Project, TaskPriority } from '../types/task';

interface QuickAddBarProps {
  projects: Project[];
  selectedProjectId: string | 'all';
  onQuickCreate: (payload: {
    title: string;
    priority: TaskPriority;
    tags: string[];
    estimatedMinutes: number;
    dueDate: string;
    projectId: string;
  }) => Promise<void>;
}

export function QuickAddBar({
  projects,
  selectedProjectId,
  onQuickCreate,
}: QuickAddBarProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => parseQuickTaskInput(input), [input]);

  const targetProjectId =
    selectedProjectId !== 'all'
      ? selectedProjectId
      : projects[0]?.id || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title || !targetProjectId || submitting) return;
    setSubmitting(true);
    try {
      await onQuickCreate({
        title: parsed.title,
        priority: parsed.priority,
        tags: parsed.tags,
        estimatedMinutes: parsed.estimatedMinutes,
        dueDate: parsed.dueDate,
        projectId: targetProjectId,
      });
      setInput('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 space-y-1.5"
    >
      <div className="flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Quick add: Ship release notes !urgent #backend @45m due:tomorrow"
          aria-label="Quick add task with smart syntax"
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-w-0"
        />
        <button
          type="submit"
          disabled={!parsed.title || !targetProjectId || submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
        >
          <span>{submitting ? 'Adding...' : 'Add'}</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>

      {input.trim().length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-7 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
            {parsed.title || 'Untitled task'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Priority: {PRIORITY_LABELS[parsed.priority]}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Est: {formatMinutes(parsed.estimatedMinutes)}</span>
          {parsed.dueDate && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Due: {parsed.dueDate}</span>
            </>
          )}
          {parsed.tags.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>Tags: {parsed.tags.map((t) => `#${t}`).join(', ')}</span>
            </>
          )}
        </div>
      )}
    </form>
  );
}
