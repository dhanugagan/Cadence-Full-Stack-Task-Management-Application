export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectAccent = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose';
export type WorkspaceView = 'board' | 'list' | 'matrix' | 'calendar' | 'analytics';
export type FocusMode = 'focus' | 'short_break' | 'long_break';

export const LIMITS = {
  TITLE_MAX: 160,
  DESCRIPTION_MAX: 4000,
  TAG_MAX: 32,
  TAGS_MAX_COUNT: 8,
  PROJECT_NAME_MAX: 80,
  PROJECT_DESC_MAX: 400,
  SUBTASK_TITLE_MAX: 160,
  DISPLAY_NAME_MAX: 100,
  ESTIMATE_MAX: 10000,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  role: 'member' | 'admin';
  email?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  accent: ProjectAccent;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  ownerId: string;
  assigneeId: string;
  dueDate: string;
  estimatedMinutes: number;
  loggedMinutes: number;
  tags: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SubtaskItem {
  id: string;
  taskId: string;
  ownerId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FocusSession {
  id: string;
  taskId: string;
  ownerId: string;
  durationMinutes: number;
  mode: FocusMode;
  completedAt?: unknown;
}

export interface ActivityEntry {
  id: string;
  workspaceId: string;
  actorName: string;
  action: string;
  targetTitle: string;
  detail: string;
  timestamp: string;
}

export interface PresenceSession {
  clientId: string;
  userName: string;
  connectedAt: string;
}

export interface ServerAnalysisSummary {
  analyzedAt: string;
  summary: {
    totalTasks: number;
    activeCount: number;
    completedCount: number;
    overdueCount: number;
    completionRate: number;
    totalEstimatedMinutes: number;
    totalLoggedMinutes: number;
  };
  quadrants: {
    do_first: string[];
    schedule: string[];
    delegate: string[];
    backlog: string[];
  };
}
