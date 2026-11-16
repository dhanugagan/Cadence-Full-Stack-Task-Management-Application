import { useState } from 'react';
import { ArrowRight, CheckSquare, PlayCircle, ShieldCheck, Sun, Moon } from 'lucide-react';

interface AuthScreenProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenTutorial: () => void;
}

export function AuthScreen({
  onSignIn,
  authError,
  isDark,
  onToggleTheme,
  onOpenTutorial,
}: AuthScreenProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await onSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 zones */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-10 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="text-lg font-bold tracking-tight font-display whitespace-nowrap shrink-0">
          Cadence
        </span>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={onOpenTutorial}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Watch Task Tutorial
          </button>
          <a
            href="#architecture"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Architecture
          </a>
          <a
            href="#security"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Authorization
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {signingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Full-Stack Task Workspace</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time WebSocket Sync</span>
            <span aria-hidden="true">·</span>
            <span>Firebase Auth</span>
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Organize sprints, priorities, and deep focus in real time.
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Create projects, parse natural quick-add syntax, triage tasks across Kanban and
            Eisenhower Matrix views, and track Pomodoro focus sessions backed by Firebase
            Firestore rules and Express WebSocket synchronization.
          </p>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-sm text-red-700 dark:text-red-300"
            >
              {authError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <span>{signingIn ? 'Connecting with Google...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Watch Task Tutorial</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 flex">
          <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <div className="relative flex-1 min-h-[260px] lg:min-h-[380px] bg-slate-100 dark:bg-slate-800">
              {!imgFailed ? (
                <img
                  src="/src/assets/images/workspace_studio_desk_1794843673132.jpg"
                  alt="Minimalist studio desk setup representing focused task planning"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                  <CheckSquare className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cadence Task Management Workspace
                  </p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div id="architecture" className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Full-Stack Sync Architecture
                </p>
                <p>
                  Express REST APIs + WebSocket room presence paired with Firestore real-time
                  snapshots.
                </p>
              </div>
              <div id="security" className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Owner-Scoped Authorization</span>
                </p>
                <p>
                  Verified Google Auth tokens enforced by strict field-level Firestore security
                  rules.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
