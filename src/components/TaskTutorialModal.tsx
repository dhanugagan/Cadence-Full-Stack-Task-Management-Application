import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
  Pause,
  Play,
  Radio,
  Terminal,
  X,
} from 'lucide-react';

interface TaskTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  summary: string;
  concept: string;
  codePreview: string;
  checklist: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'auth',
    title: '01. Authentication & Zero-Trust Authorization',
    summary:
      'Users authenticate via Google Sign-In (Firebase Auth). Every Firestore document enforces ownerId == request.auth.uid, verified email claims, and PII isolation.',
    concept: 'Firebase Auth + Firestore Rules Master Gate',
    codePreview: `// firestore.rules (Task Create Gate)
allow create: if isEmailVerified()
  && isValidTask(incoming())
  && incoming().ownerId == request.auth.uid
  && exists(/databases/$(database)/documents/projects/$(incoming().projectId));`,
    checklist: [
      'Public profile stored at /users/{uid}; email isolated in /users/{uid}/private/info.',
      'Server timestamps (request.time) prevent client clock spoofing.',
      'Strict field allowlisting (hasOnly) blocks shadow-field injection.',
    ],
  },
  {
    id: 'crud',
    title: '02. Task CRUD & Smart Quick-Add Parser',
    summary:
      'Create, edit, transition, and bulk-update tasks across Kanban, Table, and Matrix views. Use inline tokens in the Quick-Add bar to set metadata without opening modals.',
    concept: 'Deterministic Client Sanitization + Firestore Batch Writes',
    codePreview: `// Quick-Add Smart Syntax Example:
"Ship API gateway docs !urgent #backend #docs @90m due:tomorrow"
// Parsed -> priority: "urgent", tags: ["backend","docs"], estimatedMinutes: 90`,
    checklist: [
      '!urgent, !high, !medium, !low sets task priority automatically.',
      '#tag appends up to 8 categorized tags; @45m or @2h sets time estimates.',
      'due:today, due:tomorrow, or due:YYYY-MM-DD schedules the deadline.',
    ],
  },
  {
    id: 'realtime',
    title: '03. Dual Real-Time Engine (WebSockets + Firestore)',
    summary:
      'Firestore onSnapshot streams persistent task state while our Express + ws server on port 3000 broadcasts live tab presence, focus timers, and workspace activity.',
    concept: 'Express HTTP + WebSocket Hub (/ws)',
    codePreview: `// Client -> Server WebSocket Join & Sync
ws.send(JSON.stringify({ type: 'join', workspaceId, clientId, userName }));
// Server broadcasts delta events idempotently to all active workspace sessions`,
    checklist: [
      'Automatic exponential-backoff reconnection if the socket drops.',
      'Idempotent activity feed deduplicates events by unique eventId.',
      'Live presence counter reflects real connected browser sessions.',
    ],
  },
  {
    id: 'api',
    title: '04. REST API Integration & Productivity Tools',
    summary:
      'Server endpoints handle Eisenhower workload analysis, CSV/JSON/Markdown exports, and live workspace audit logs alongside the built-in Pomodoro Focus Timer.',
    concept: 'Express /api/* Endpoints + Focus Sessions',
    codePreview: `POST /api/tasks/analyze  -> Eisenhower Quadrant & completion metrics
POST /api/tasks/export   -> Downloadable CSV, JSON, or Markdown checklist
GET/POST /api/activity   -> Persistent workspace audit stream`,
    checklist: [
      'Press Cmd+K (or Ctrl+K) anywhere to open the keyboard Command Palette.',
      'Attach any task to the Focus Timer to log real minutes into /focusSessions.',
      'Export filtered sprints cleanly as CSV spreadsheets or Markdown checklists.',
    ],
  },
];

export function TaskTutorialModal({ isOpen, onClose }: TaskTutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!isOpen || !autoPlay) return;
    const timer = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= TUTORIAL_STEPS.length - 1) {
          setAutoPlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [isOpen, autoPlay]);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[stepIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="tutorial-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Interactive Task Tutorial &amp; Architecture Guide
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step {stepIndex + 1} of {TUTORIAL_STEPS.length} · Full-stack walkthrough
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAutoPlay((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoPlay ? 'Pause Tour' : 'Auto-Play Tour'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tutorial"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          {TUTORIAL_STEPS.map((item, idx) => {
            const active = idx === stepIndex;
            const Icons = [Lock, Layers, Radio, Terminal];
            const Icon = Icons[idx];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAutoPlay(false);
                  setStepIndex(idx);
                }}
                className={`flex items-center justify-center gap-2 py-3 px-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline truncate">
                  {idx === 0 ? 'Auth & Rules' : idx === 1 ? 'CRUD & Syntax' : idx === 2 ? 'WebSockets' : 'REST API'}
                </span>
                <span className="sm:hidden tabular-nums">0{idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{step.concept}</p>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {step.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {step.summary}
            </p>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
            <code>{step.codePreview}</code>
          </pre>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Key Implementation Takeaways
            </p>
            <ul className="space-y-2">
              {step.checklist.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-500">
            <span>{stepIndex + 1}</span>
            <span>/</span>
            <span>{TUTORIAL_STEPS.length}</span>
          </div>

          {stepIndex < TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <span>Next Lesson</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white transition-colors whitespace-nowrap shrink-0"
            >
              <span>Start Managing Tasks</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
