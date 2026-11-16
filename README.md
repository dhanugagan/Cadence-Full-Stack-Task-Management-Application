# Cadence — Full-Stack Task Management Application

Cadence is a full-stack, real-time task management web application built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Express**, **WebSockets (`ws`)**, **Firebase Authentication**, and **Cloud Firestore**.

It demonstrates a production-oriented full-stack architecture combining real-time database persistence, owner-scoped security rules, REST API endpoints, and a WebSocket synchronization hub on port `3000`.

---

## Key Features

### 1. Authentication & Zero-Trust Authorization
- **Google Sign-In (Firebase Auth)**: Uses `signInWithPopup` with verified identity claims.
- **PII Isolation**: Public profile metadata lives at `/users/{uid}`, while sensitive fields (`email`) are isolated at `/users/{uid}/private/info`.
- **Hardened Firestore Security Rules**: Defined in `firestore.rules` and validated with `@firebase/eslint-plugin-security-rules`. Enforces:
  - Verified email checks (`request.auth.token.email_verified == true`)
  - Strict field allowlisting (`hasAll` / `hasOnly` / `affectedKeys().hasOnly(...)`)
  - Parent-child Master Gate referential checks (`exists()` / `get()`)
  - Immutable `ownerId` and `createdAt` fields with server-enforced `request.time` timestamps
  - Terminal state locking for `archived` tasks and append-only `focusSessions`

### 2. Full Task & Project CRUD
- **Projects / Workspaces**: Create, edit, color-code, and delete projects (cascading task & subtask cleanup).
- **Tasks**: Create, inspect, edit, drag-and-drop across statuses, archive, or delete tasks.
- **Subtask Checklists**: Real-time Firestore subcollection (`/tasks/{taskId}/subtasks/{subtaskId}`) with live completion progress bar.
- **Bulk Operations**: Multi-select tasks in the Table view to batch-mark as Done, escalate to Urgent, or delete.

### 3. Innovative Productivity Features
- **Smart Quick-Add Syntax Parser**: Type natural inline tokens directly in the quick-add bar with live preview:
  - `!urgent`, `!high`, `!medium`, `!low` — Priority
  - `#tag` — Up to 8 tags
  - `@45m` or `@2h` — Time estimate
  - `due:today`, `due:tomorrow`, `due:nextweek`, or `due:YYYY-MM-DD` — Deadline
- **Five Synchronized Workspace Views**:
  1. **Kanban Board**: 5 workflow columns (`Backlog`, `To Do`, `In Progress`, `In Review`, `Done`) with drag-and-drop and accessible status selectors.
  2. **Task Table**: High-density sortable grid with multi-select bulk actions and CSV / Markdown / JSON export.
  3. **Eisenhower Priority Matrix**: Automatically classifies active tasks into *Do First*, *Schedule*, *Quick Wins / Triage*, and *Backlog*.
  4. **Schedule / Timeline**: Groups tasks chronologically into *Overdue*, *Due Today*, *Next 7 Days*, *Later*, and *Completed*.
  5. **Analytics & Live Sync**: Server-computed sprint metrics, workflow distribution charts, connected tab presence, and live WebSocket audit feed.
- **Built-in Pomodoro Focus Timer**: Supports 25m Focus, 5m Short Break, and 15m Long Break modes linked to any task, persisting completed sessions to `/focusSessions` and incrementing `loggedMinutes`.
- **Keyboard Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant navigation across views, tasks, exports, theme switching, and the tutorial.
- **Watch Task Tutorial**: Interactive step-by-step walkthrough embedded directly in the app (`TaskTutorialModal`) explaining the full-stack architecture and features.
- **Dual Theme & Responsive Layout**: Light/Dark theme persistence and responsive desktop sidebar + mobile navigation drawer.

---

## Full-Stack Architecture

```
React 19 SPA (Vite + Tailwind v4)
  ├── Firebase SDK (Google Auth + Firestore onSnapshot real-time DB)
  ├── WebSocket Client (/ws) -> Presence, Focus sync, & Live Activity
  └── REST API Client (/api/*)
        │
        ▼
Express + WebSocket Server (server.ts, Port 3000)
  ├── GET  /api/health         -> Server & WebSocket room telemetry
  ├── GET  /api/activity       -> Fetch workspace activity log & presence
  ├── POST /api/activity       -> Record & broadcast activity over WebSockets
  ├── POST /api/tasks/analyze  -> Server-side workload & Eisenhower classification
  ├── POST /api/tasks/export   -> Generate CSV, Markdown, or JSON downloads
  └── WS   /ws                 -> Room-based presence & idempotent event sync
```

---

## Project Structure

```
├── server.ts                  # Express HTTP + WebSocket (/ws) + Vite middleware server
├── firestore.rules            # Hardened Firestore authorization rules
├── firebase-blueprint.json    # Entity & collection schema specification
├── security_spec.md           # Phase 0 security invariants & adversarial test suite
├── eslint.config.mjs          # ESLint config with @firebase/eslint-plugin-security-rules
├── index.html                 # HTML entry & typography links
└── src/
    ├── App.tsx                # Main workspace orchestrator
    ├── index.css              # Tailwind v4 setup + dark mode variant
    ├── types/task.ts          # Domain TypeScript types & blueprint limits
    ├── lib/
    │   ├── firebase.ts        # Firebase initialization & structured error handler
    │   └── taskParser.ts      # Quick-Add parser, date helpers, & Eisenhower classifier
    ├── hooks/
    │   ├── useFirestoreWorkspace.ts  # Auth, real-time snapshots, & CRUD mutations
    │   └── useWebSocketSync.ts       # Auto-reconnecting WebSocket & REST activity client
    └── components/
        ├── AuthScreen.tsx
        ├── Sidebar.tsx
        ├── TopBar.tsx
        ├── QuickAddBar.tsx
        ├── KanbanBoard.tsx
        ├── TaskTableView.tsx
        ├── EisenhowerMatrix.tsx
        ├── CalendarTimelineView.tsx
        ├── AnalyticsView.tsx
        ├── TaskDetailDrawer.tsx
        ├── FocusTimerModal.tsx
        ├── TaskTutorialModal.tsx
        ├── CommandPalette.tsx
        ├── ProjectModal.tsx
        └── ErrorBoundary.tsx
```

---

## Scripts & Local Verification

```bash
# Install dependencies
npm install

# Run full-stack development server (Express + WebSockets + Vite on port 3000)
npm run dev

# Type-check TypeScript
npm run lint

# Audit Firestore security rules with ESLint
npm run lint:rules

# Build production client bundle
npm run build

# Start production server
NODE_ENV=production npm start
```
