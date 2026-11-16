import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientSession {
  ws: WebSocket;
  clientId: string;
  workspaceId: string;
  userName: string;
  connectedAt: string;
}

interface ActivityEntry {
  id: string;
  workspaceId: string;
  actorName: string;
  action: string;
  targetTitle: string;
  detail: string;
  timestamp: string;
}

interface IncomingTaskPayload {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  estimatedMinutes: number;
  loggedMinutes: number;
  projectId: string;
  tags: string[];
}

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Server-authoritative state for WebSocket presence & workspace activity stream
const workspaceClients = new Map<string, Map<string, ClientSession>>();
const workspaceActivity = new Map<string, ActivityEntry[]>();

function getPresenceList(workspaceId: string) {
  const room = workspaceClients.get(workspaceId);
  if (!room) return [];
  return Array.from(room.values()).map((session) => ({
    clientId: session.clientId,
    userName: session.userName,
    connectedAt: session.connectedAt,
  }));
}

function broadcastToWorkspace(workspaceId: string, payload: unknown, excludeClientId?: string) {
  const room = workspaceClients.get(workspaceId);
  if (!room) return;
  const serialized = JSON.stringify(payload);
  for (const session of room.values()) {
    if (excludeClientId && session.clientId === excludeClientId) continue;
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(serialized);
    }
  }
}

function recordActivity(entry: ActivityEntry) {
  const list = workspaceActivity.get(entry.workspaceId) || [];
  // Idempotent guard against duplicate event IDs
  if (list.some((item) => item.id === entry.id)) {
    return list;
  }
  const updated = [entry, ...list].slice(0, 60);
  workspaceActivity.set(entry.workspaceId, updated);
  return updated;
}

function computeEisenhowerQuadrant(task: IncomingTaskPayload, todayIso: string): 'do_first' | 'schedule' | 'delegate' | 'backlog' {
  const isImportant = task.priority === 'urgent' || task.priority === 'high';
  let isUrgent = task.priority === 'urgent';

  if (task.dueDate) {
    const dueMs = Date.parse(task.dueDate);
    const todayMs = Date.parse(todayIso);
    if (!Number.isNaN(dueMs) && !Number.isNaN(todayMs)) {
      const diffDays = (dueMs - todayMs) / (1000 * 60 * 60 * 24);
      if (diffDays <= 2) {
        isUrgent = true;
      }
    }
  }

  if (isImportant && isUrgent) return 'do_first';
  if (isImportant && !isUrgent) return 'schedule';
  if (!isImportant && isUrgent) return 'delegate';
  return 'backlog';
}

function escapeCsvField(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health & WebSocket hub status endpoint
  app.get('/api/health', (_req, res) => {
    let totalConnections = 0;
    for (const room of workspaceClients.values()) {
      totalConnections += room.size;
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeWorkspaces: workspaceClients.size,
      activeConnections: totalConnections,
    });
  });

  // Fetch workspace activity stream
  app.get('/api/activity', (req, res) => {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId.trim() : '';
    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId query parameter is required.' });
      return;
    }
    res.json({
      workspaceId,
      entries: workspaceActivity.get(workspaceId) || [],
      presence: getPresenceList(workspaceId),
    });
  });

  // Record workspace activity and broadcast over WebSockets
  app.post('/api/activity', (req, res) => {
    const { id, workspaceId, actorName, action, targetTitle, detail } = req.body || {};
    if (
      typeof workspaceId !== 'string' || !workspaceId.trim() ||
      typeof action !== 'string' || !action.trim() ||
      typeof targetTitle !== 'string'
    ) {
      res.status(400).json({ error: 'Invalid activity payload.' });
      return;
    }

    const entry: ActivityEntry = {
      id: typeof id === 'string' && id ? id : `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: workspaceId.slice(0, 128),
      actorName: typeof actorName === 'string' && actorName ? actorName.slice(0, 100) : 'Workspace Member',
      action: action.slice(0, 64),
      targetTitle: targetTitle.slice(0, 160),
      detail: typeof detail === 'string' ? detail.slice(0, 240) : '',
      timestamp: new Date().toISOString(),
    };

    recordActivity(entry);
    broadcastToWorkspace(entry.workspaceId, {
      type: 'activity:new',
      entry,
    });

    res.status(201).json({ entry });
  });

  // Server-side workload, Eisenhower quadrant & sprint analytics endpoint
  app.post('/api/tasks/analyze', (req, res) => {
    const tasks: IncomingTaskPayload[] = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const todayIso = new Date().toISOString().slice(0, 10);

    const quadrants = {
      do_first: [] as string[],
      schedule: [] as string[],
      delegate: [] as string[],
      backlog: [] as string[],
    };

    let totalEstimated = 0;
    let totalLogged = 0;
    let overdueCount = 0;
    let completedCount = 0;

    for (const task of tasks) {
      if (!task || typeof task.id !== 'string') continue;
      if (task.status === 'archived') continue;

      if (task.status === 'done') {
        completedCount += 1;
      } else {
        const q = computeEisenhowerQuadrant(task, todayIso);
        quadrants[q].push(task.id);
        if (task.dueDate && task.dueDate < todayIso) {
          overdueCount += 1;
        }
      }

      totalEstimated += Number(task.estimatedMinutes) || 0;
      totalLogged += Number(task.loggedMinutes) || 0;
    }

    const activeCount = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived').length;
    const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    res.json({
      analyzedAt: new Date().toISOString(),
      summary: {
        totalTasks: tasks.length,
        activeCount,
        completedCount,
        overdueCount,
        completionRate,
        totalEstimatedMinutes: totalEstimated,
        totalLoggedMinutes: totalLogged,
      },
      quadrants,
    });
  });

  // Export tasks as CSV, JSON, or Markdown report
  app.post('/api/tasks/export', (req, res) => {
    const tasks: IncomingTaskPayload[] = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const format = req.body?.format === 'csv' || req.body?.format === 'markdown' ? req.body.format : 'json';

    if (format === 'csv') {
      const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Est. Minutes', 'Logged Minutes', 'Tags'];
      const rows = tasks.map((t) => [
        escapeCsvField(t.id),
        escapeCsvField(t.title),
        escapeCsvField(t.status),
        escapeCsvField(t.priority),
        escapeCsvField(t.dueDate || ''),
        escapeCsvField(t.estimatedMinutes || 0),
        escapeCsvField(t.loggedMinutes || 0),
        escapeCsvField(Array.isArray(t.tags) ? t.tags.join('; ') : ''),
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csv);
      return;
    }

    if (format === 'markdown') {
      const lines = [
        '# Cadence Task Export',
        `Generated: ${new Date().toISOString()}`,
        '',
        ...tasks.map((t) => {
          const mark = t.status === 'done' ? 'x' : ' ';
          const meta = [t.priority.toUpperCase(), t.status, t.dueDate ? `Due ${t.dueDate}` : null]
            .filter(Boolean)
            .join(' · ');
          return `- [${mark}] **${t.title}** (${meta})`;
        }),
      ];
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(lines.join('\n'));
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), count: tasks.length, tasks }, null, 2));
  });

  // Setup HTTP + WebSocket Server on the same port (3000)
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let activeWorkspaceId = '';
    let activeClientId = '';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'join') {
          const workspaceId = typeof msg.workspaceId === 'string' ? msg.workspaceId.slice(0, 128) : '';
          const clientId = typeof msg.clientId === 'string' ? msg.clientId.slice(0, 128) : '';
          const userName = typeof msg.userName === 'string' ? msg.userName.slice(0, 100) : 'Member';

          if (!workspaceId || !clientId) return;

          // Leave prior room if switching
          if (activeWorkspaceId && activeClientId) {
            const prevRoom = workspaceClients.get(activeWorkspaceId);
            prevRoom?.delete(activeClientId);
            broadcastToWorkspace(activeWorkspaceId, {
              type: 'presence:update',
              presence: getPresenceList(activeWorkspaceId),
            });
          }

          activeWorkspaceId = workspaceId;
          activeClientId = clientId;

          if (!workspaceClients.has(workspaceId)) {
            workspaceClients.set(workspaceId, new Map());
          }
          workspaceClients.get(workspaceId)!.set(clientId, {
            ws,
            clientId,
            workspaceId,
            userName,
            connectedAt: new Date().toISOString(),
          });

          // Send initial authoritative state to newly connected client
          ws.send(JSON.stringify({
            type: 'init',
            workspaceId,
            presence: getPresenceList(workspaceId),
            activity: workspaceActivity.get(workspaceId) || [],
          }));

          // Notify other connected sessions in the same workspace
          broadcastToWorkspace(workspaceId, {
            type: 'presence:update',
            presence: getPresenceList(workspaceId),
          }, clientId);
          return;
        }

        if (msg.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          return;
        }

        if (msg.type === 'task:sync' && activeWorkspaceId) {
          broadcastToWorkspace(activeWorkspaceId, {
            type: 'task:sync',
            eventId: msg.eventId,
            action: msg.action,
            taskId: msg.taskId,
            actorName: msg.actorName,
            timestamp: new Date().toISOString(),
          }, activeClientId);
          return;
        }

        if (msg.type === 'focus:sync' && activeWorkspaceId) {
          broadcastToWorkspace(activeWorkspaceId, {
            type: 'focus:sync',
            taskId: msg.taskId,
            taskTitle: msg.taskTitle,
            mode: msg.mode,
            isRunning: Boolean(msg.isRunning),
            secondsLeft: Number(msg.secondsLeft) || 0,
            actorName: msg.actorName,
          }, activeClientId);
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on('close', () => {
      if (activeWorkspaceId && activeClientId) {
        const room = workspaceClients.get(activeWorkspaceId);
        if (room) {
          room.delete(activeClientId);
          if (room.size === 0) {
            workspaceClients.delete(activeWorkspaceId);
          } else {
            broadcastToWorkspace(activeWorkspaceId, {
              type: 'presence:update',
              presence: getPresenceList(activeWorkspaceId),
            });
          }
        }
      }
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cadence server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
