import { LIMITS, type TaskItem, type TaskPriority, type TaskStatus } from '../types/task';

export interface ParsedQuickTask {
  title: string;
  priority: TaskPriority;
  tags: string[];
  estimatedMinutes: number;
  dueDate: string;
}

export function formatIsoDateOffset(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return formatIsoDateOffset(0);
}

/**
 * Deterministic Quick-Add parser supporting:
 *   !urgent | !high | !medium | !low
 *   #tag
 *   @30m | @2h
 *   due:today | due:tomorrow | due:nextweek | due:YYYY-MM-DD
 */
export function parseQuickTaskInput(raw: string): ParsedQuickTask {
  let working = raw.trim();
  let priority: TaskPriority = 'medium';
  let estimatedMinutes = 30;
  let dueDate = '';
  const tags: string[] = [];

  // Priority extraction
  working = working.replace(/(?:^|\s)!(urgent|high|medium|low)(?=\s|$)/gi, (_m, p: string) => {
    const normalized = p.toLowerCase();
    if (normalized === 'urgent' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      priority = normalized;
    }
    return ' ';
  });

  // Due date extraction
  working = working.replace(/(?:^|\s)due:([a-zA-Z0-9_-]+)(?=\s|$)/gi, (_m, d: string) => {
    const lower = d.toLowerCase();
    if (lower === 'today') {
      dueDate = formatIsoDateOffset(0);
    } else if (lower === 'tomorrow') {
      dueDate = formatIsoDateOffset(1);
    } else if (lower === 'nextweek' || lower === 'week') {
      dueDate = formatIsoDateOffset(7);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      dueDate = d.slice(0, 32);
    }
    return ' ';
  });

  // Estimate extraction (@30m, @2h, @1.5h)
  working = working.replace(/(?:^|\s)@(\d+(?:\.\d+)?)(h|m)(?=\s|$)/gi, (_m, num: string, unit: string) => {
    const parsed = Number(num);
    if (!Number.isNaN(parsed) && parsed > 0) {
      const mins = unit.toLowerCase() === 'h' ? Math.round(parsed * 60) : Math.round(parsed);
      estimatedMinutes = Math.min(Math.max(mins, 5), LIMITS.ESTIMATE_MAX);
    }
    return ' ';
  });

  // Tag extraction (#tag)
  working = working.replace(/(?:^|\s)#([a-zA-Z0-9_-]+)(?=\s|$)/g, (_m, tag: string) => {
    const clean = tag.trim().toLowerCase().slice(0, LIMITS.TAG_MAX);
    if (clean && !tags.includes(clean) && tags.length < LIMITS.TAGS_MAX_COUNT) {
      tags.push(clean);
    }
    return ' ';
  });

  const title = working.replace(/\s+/g, ' ').trim().slice(0, LIMITS.TITLE_MAX);

  return {
    title,
    priority,
    tags,
    estimatedMinutes,
    dueDate,
  };
}

export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function isTaskOverdue(dueDate: string, status: TaskStatus): boolean {
  if (!dueDate || status === 'done' || status === 'archived') return false;
  return dueDate < getTodayIso();
}

export function isTaskDueSoon(dueDate: string, status: TaskStatus): boolean {
  if (!dueDate || status === 'done' || status === 'archived') return false;
  const today = getTodayIso();
  const soon = formatIsoDateOffset(2);
  return dueDate >= today && dueDate <= soon;
}

export function getEisenhowerQuadrant(
  task: Pick<TaskItem, 'priority' | 'dueDate'>
): 'do_first' | 'schedule' | 'delegate' | 'backlog' {
  const isImportant = task.priority === 'urgent' || task.priority === 'high';
  let isUrgent = task.priority === 'urgent';
  if (task.dueDate) {
    const soon = formatIsoDateOffset(2);
    if (task.dueDate <= soon) {
      isUrgent = true;
    }
  }
  if (isImportant && isUrgent) return 'do_first';
  if (isImportant && !isUrgent) return 'schedule';
  if (!isImportant && isUrgent) return 'delegate';
  return 'backlog';
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  done: 'Done',
  archived: 'Archived',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
