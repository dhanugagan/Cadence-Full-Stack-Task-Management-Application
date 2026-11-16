import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityEntry, PresenceSession } from '../types/task';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface RemoteFocusState {
  taskId: string;
  taskTitle: string;
  mode: string;
  isRunning: boolean;
  secondsLeft: number;
  actorName: string;
}

export function useWebSocketSync(workspaceId: string | null, userName: string) {
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [presence, setPresence] = useState<PresenceSession[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [remoteFocus, setRemoteFocus] = useState<RemoteFocusState | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(
    `tab_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
  );
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setSocketStatus('disconnected');
      setPresence([]);
      setActivity([]);
      return;
    }

    let isDisposed = false;

    const clearTimers = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pingIntervalRef.current !== null) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const connect = () => {
      if (isDisposed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      setSocketStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDisposed) {
          ws.close();
          return;
        }
        reconnectAttemptRef.current = 0;
        setSocketStatus('connected');

        ws.send(
          JSON.stringify({
            type: 'join',
            workspaceId,
            clientId: clientIdRef.current,
            userName: userName || 'Workspace Member',
          })
        );

        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg || typeof msg.type !== 'string') return;

          if (msg.type === 'init') {
            if (Array.isArray(msg.presence)) setPresence(msg.presence);
            if (Array.isArray(msg.activity)) setActivity(msg.activity);
          } else if (msg.type === 'presence:update') {
            if (Array.isArray(msg.presence)) setPresence(msg.presence);
          } else if (msg.type === 'activity:new' && msg.entry) {
            setActivity((prev) => {
              if (prev.some((item) => item.id === msg.entry.id)) return prev;
              return [msg.entry, ...prev].slice(0, 60);
            });
          } else if (msg.type === 'focus:sync') {
            setRemoteFocus({
              taskId: msg.taskId,
              taskTitle: msg.taskTitle,
              mode: msg.mode,
              isRunning: Boolean(msg.isRunning),
              secondsLeft: Number(msg.secondsLeft) || 0,
              actorName: msg.actorName || 'Session',
            });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        clearTimers();
        if (isDisposed) return;
        const delay = Math.min(1000 * Math.pow(1.7, reconnectAttemptRef.current), 15000);
        reconnectAttemptRef.current += 1;
        setSocketStatus('reconnecting');
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      isDisposed = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [workspaceId, userName]);

  const emitTaskSync = useCallback(
    (action: string, taskId: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'task:sync',
            eventId: `${action}_${taskId}_${Date.now()}`,
            action,
            taskId,
            actorName: userName,
          })
        );
      }
    },
    [userName]
  );

  const emitFocusSync = useCallback(
    (payload: {
      taskId: string;
      taskTitle: string;
      mode: string;
      isRunning: boolean;
      secondsLeft: number;
    }) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'focus:sync',
            ...payload,
            actorName: userName,
          })
        );
      }
    },
    [userName]
  );

  const logActivity = useCallback(
    async (action: string, targetTitle: string, detail = '') => {
      if (!workspaceId) return;
      const entryId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        const res = await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: entryId,
            workspaceId,
            actorName: userName || 'Workspace Member',
            action,
            targetTitle,
            detail,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.entry) {
            setActivity((prev) => {
              if (prev.some((item) => item.id === data.entry.id)) return prev;
              return [data.entry, ...prev].slice(0, 60);
            });
          }
        }
      } catch {
        // Non-blocking activity audit log failure
      }
    },
    [workspaceId, userName]
  );

  return {
    socketStatus,
    presence,
    activity,
    remoteFocus,
    emitTaskSync,
    emitFocusSync,
    logActivity,
  };
}
