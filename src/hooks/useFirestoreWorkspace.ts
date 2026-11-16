import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import { formatIsoDateOffset } from '../lib/taskParser';
import {
  LIMITS,
  type FocusMode,
  type FocusSession,
  type Project,
  type ProjectAccent,
  type SubtaskItem,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
  type UserProfile,
} from '../types/task';

export function useFirestoreWorkspace() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  const ensureUserProvisioned = useCallback(async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const safeName = (user.displayName || user.email?.split('@')[0] || 'Workspace Member')
      .trim()
      .slice(0, LIMITS.DISPLAY_NAME_MAX);
    const safePhoto = (user.photoURL || '').slice(0, 500);
    const safeEmail = (user.email || 'member@example.com').slice(0, 254);

    try {
      const existingSnap = await getDoc(userRef);
      if (!existingSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: safeName,
          photoURL: safePhoto,
          role: 'member',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(privateRef, {
          uid: user.uid,
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
        setUserProfile({
          uid: user.uid,
          displayName: safeName,
          photoURL: safePhoto,
          role: 'member',
          email: safeEmail,
        });
      } else {
        const data = existingSnap.data();
        setUserProfile({
          uid: user.uid,
          displayName: data.displayName || safeName,
          photoURL: data.photoURL || safePhoto,
          role: data.role === 'admin' ? 'admin' : 'member',
          email: safeEmail,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }

    // Seed an initial project & starter tasks if this user has zero projects yet
    try {
      const projQuery = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
      const projSnap = await getDocs(projQuery);
      if (projSnap.empty) {
        const starterProjRef = await addDoc(collection(db, 'projects'), {
          name: 'Product Launch Q4',
          description: 'Core engineering, API docs, and responsive release milestones.',
          accent: 'blue' as ProjectAccent,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const starterTasks: Array<{
          title: string;
          description: string;
          status: TaskStatus;
          priority: TaskPriority;
          dueDate: string;
          estimatedMinutes: number;
          loggedMinutes: number;
          tags: string[];
        }> = [
          {
            title: 'Finalize REST API contract & WebSocket event schema',
            description: 'Document /api/activity, /api/tasks/analyze, and /ws room broadcasts for real-time clients.',
            status: 'in_progress',
            priority: 'urgent',
            dueDate: formatIsoDateOffset(0),
            estimatedMinutes: 90,
            loggedMinutes: 25,
            tags: ['backend', 'websocket'],
          },
          {
            title: 'Audit Firestore security rules against Dirty Dozen suite',
            description: 'Verify strict keys, owner immutability, server timestamps, and PII isolation.',
            status: 'review',
            priority: 'high',
            dueDate: formatIsoDateOffset(1),
            estimatedMinutes: 60,
            loggedMinutes: 45,
            tags: ['security', 'firebase'],
          },
          {
            title: 'Implement responsive mobile drawer & touch targets',
            description: 'Ensure all interactive controls meet 44px minimum touch height on narrow viewports.',
            status: 'todo',
            priority: 'high',
            dueDate: formatIsoDateOffset(2),
            estimatedMinutes: 45,
            loggedMinutes: 0,
            tags: ['ui', 'mobile'],
          },
          {
            title: 'Draft onboarding README & architecture walkthrough',
            description: 'Explain Express + WebSocket + Firebase Auth integration for new contributors.',
            status: 'backlog',
            priority: 'medium',
            dueDate: formatIsoDateOffset(5),
            estimatedMinutes: 60,
            loggedMinutes: 0,
            tags: ['docs'],
          },
          {
            title: 'Configure Google Sign-In & Firebase project bindings',
            description: 'Provision Firestore database instance and validate live server connectivity.',
            status: 'done',
            priority: 'medium',
            dueDate: formatIsoDateOffset(-1),
            estimatedMinutes: 30,
            loggedMinutes: 30,
            tags: ['auth'],
          },
        ];

        const batch = writeBatch(db);
        for (const item of starterTasks) {
          const taskRef = doc(collection(db, 'tasks'));
          batch.set(taskRef, {
            ...item,
            projectId: starterProjRef.id,
            ownerId: user.uid,
            assigneeId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        setDataLoading(true);
        try {
          await ensureUserProvisioned(user);
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Failed to initialize user workspace.');
        }
      } else {
        setUserProfile(null);
        setProjects([]);
        setTasks([]);
        setFocusSessions([]);
        setDataLoading(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [ensureUserProvisioned]);

  // Attach real-time Firestore listeners once authenticated
  useEffect(() => {
    if (!authUser) return;

    const projQuery = query(collection(db, 'projects'), where('ownerId', '==', authUser.uid));
    const tasksQuery = query(collection(db, 'tasks'), where('ownerId', '==', authUser.uid));
    const sessionsQuery = query(collection(db, 'focusSessions'), where('ownerId', '==', authUser.uid));

    let loadedFlags = { projects: false, tasks: false, sessions: false };
    const markReady = (key: keyof typeof loadedFlags) => {
      loadedFlags[key] = true;
      if (loadedFlags.projects && loadedFlags.tasks && loadedFlags.sessions) {
        setDataLoading(false);
      }
    };

    const unsubProjects = onSnapshot(
      projQuery,
      (snapshot) => {
        const items: Project[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Project, 'id'>),
        }));
        setProjects(items);
        markReady('projects');
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    const unsubTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const items: TaskItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TaskItem, 'id'>),
        }));
        setTasks(items);
        markReady('tasks');
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
    );

    const unsubSessions = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const items: FocusSession[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FocusSession, 'id'>),
        }));
        setFocusSessions(items);
        markReady('sessions');
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'focusSessions')
    );

    return () => {
      unsubProjects();
      unsubTasks();
      unsubSessions();
    };
  }, [authUser]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in was cancelled or failed.';
      setAuthError(message);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  // --- Project CRUD ---
  const createProject = useCallback(
    async (input: { name: string; description: string; accent: ProjectAccent }) => {
      if (!authUser) return null;
      const cleanName = input.name.trim().slice(0, LIMITS.PROJECT_NAME_MAX);
      if (!cleanName) return null;
      try {
        const ref = await addDoc(collection(db, 'projects'), {
          name: cleanName,
          description: input.description.trim().slice(0, LIMITS.PROJECT_DESC_MAX),
          accent: input.accent,
          ownerId: authUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'projects');
      }
    },
    [authUser]
  );

  const updateProject = useCallback(
    async (projectId: string, input: { name: string; description: string; accent: ProjectAccent }) => {
      if (!authUser) return;
      const cleanName = input.name.trim().slice(0, LIMITS.PROJECT_NAME_MAX);
      if (!cleanName) return;
      try {
        await updateDoc(doc(db, 'projects', projectId), {
          name: cleanName,
          description: input.description.trim().slice(0, LIMITS.PROJECT_DESC_MAX),
          accent: input.accent,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`);
      }
    },
    [authUser]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!authUser) return;
      try {
        const projectTasks = tasks.filter((t) => t.projectId === projectId);
        for (const t of projectTasks) {
          const subSnap = await getDocs(collection(db, 'tasks', t.id, 'subtasks'));
          const batch = writeBatch(db);
          subSnap.forEach((s) => batch.delete(s.ref));
          batch.delete(doc(db, 'tasks', t.id));
          await batch.commit();
        }
        await deleteDoc(doc(db, 'projects', projectId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}`);
      }
    },
    [authUser, tasks]
  );

  // --- Task CRUD ---
  const createTask = useCallback(
    async (input: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      projectId: string;
      dueDate?: string;
      estimatedMinutes?: number;
      tags?: string[];
    }) => {
      if (!authUser) return null;
      const cleanTitle = input.title.trim().slice(0, LIMITS.TITLE_MAX);
      if (!cleanTitle || !input.projectId) return null;

      const cleanTags = (input.tags || [])
        .map((t) => t.trim().toLowerCase().slice(0, LIMITS.TAG_MAX))
        .filter(Boolean)
        .slice(0, LIMITS.TAGS_MAX_COUNT);

      const est = Math.min(Math.max(Number(input.estimatedMinutes) || 0, 0), LIMITS.ESTIMATE_MAX);

      try {
        const ref = await addDoc(collection(db, 'tasks'), {
          title: cleanTitle,
          description: (input.description || '').trim().slice(0, LIMITS.DESCRIPTION_MAX),
          status: input.status || 'todo',
          priority: input.priority || 'medium',
          projectId: input.projectId,
          ownerId: authUser.uid,
          assigneeId: authUser.uid,
          dueDate: (input.dueDate || '').slice(0, 32),
          estimatedMinutes: est,
          loggedMinutes: 0,
          tags: cleanTags,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'tasks');
      }
    },
    [authUser]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<
        Pick<
          TaskItem,
          'title' | 'description' | 'status' | 'priority' | 'projectId' | 'dueDate' | 'estimatedMinutes' | 'loggedMinutes' | 'tags'
        >
      >
    ) => {
      if (!authUser) return;
      const sanitized: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (typeof updates.title === 'string') {
        const t = updates.title.trim().slice(0, LIMITS.TITLE_MAX);
        if (t) sanitized.title = t;
      }
      if (typeof updates.description === 'string') {
        sanitized.description = updates.description.trim().slice(0, LIMITS.DESCRIPTION_MAX);
      }
      if (updates.status) sanitized.status = updates.status;
      if (updates.priority) sanitized.priority = updates.priority;
      if (updates.projectId) sanitized.projectId = updates.projectId;
      if (typeof updates.dueDate === 'string') sanitized.dueDate = updates.dueDate.slice(0, 32);
      if (typeof updates.estimatedMinutes === 'number') {
        sanitized.estimatedMinutes = Math.min(Math.max(updates.estimatedMinutes, 0), LIMITS.ESTIMATE_MAX);
      }
      if (typeof updates.loggedMinutes === 'number') {
        sanitized.loggedMinutes = Math.min(Math.max(updates.loggedMinutes, 0), 100000);
      }
      if (Array.isArray(updates.tags)) {
        sanitized.tags = updates.tags
          .map((t) => t.trim().toLowerCase().slice(0, LIMITS.TAG_MAX))
          .filter(Boolean)
          .slice(0, LIMITS.TAGS_MAX_COUNT);
      }

      try {
        await updateDoc(doc(db, 'tasks', taskId), sanitized);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
      }
    },
    [authUser]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!authUser) return;
      try {
        const subSnap = await getDocs(collection(db, 'tasks', taskId, 'subtasks'));
        const batch = writeBatch(db);
        subSnap.forEach((s) => batch.delete(s.ref));
        batch.delete(doc(db, 'tasks', taskId));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
      }
    },
    [authUser]
  );

  const bulkUpdateTasks = useCallback(
    async (taskIds: string[], patch: Partial<Pick<TaskItem, 'status' | 'priority'>>) => {
      if (!authUser || taskIds.length === 0) return;
      try {
        const batch = writeBatch(db);
        for (const id of taskIds) {
          batch.update(doc(db, 'tasks', id), {
            ...patch,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'tasks/bulk');
      }
    },
    [authUser]
  );

  const bulkDeleteTasks = useCallback(
    async (taskIds: string[]) => {
      if (!authUser || taskIds.length === 0) return;
      try {
        for (const id of taskIds) {
          await deleteTask(id);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'tasks/bulk');
      }
    },
    [authUser, deleteTask]
  );

  // --- Subtasks ---
  const subscribeSubtasks = useCallback(
    (taskId: string, onData: (items: SubtaskItem[]) => void) => {
      if (!authUser) return () => {};
      const q = query(
        collection(db, 'tasks', taskId, 'subtasks'),
        where('ownerId', '==', authUser.uid)
      );
      return onSnapshot(
        q,
        (snap) => {
          const items = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as Omit<SubtaskItem, 'id'>),
            }))
            .sort((a, b) => a.order - b.order);
          onData(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `tasks/${taskId}/subtasks`)
      );
    },
    [authUser]
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string, order: number) => {
      if (!authUser) return;
      const cleanTitle = title.trim().slice(0, LIMITS.SUBTASK_TITLE_MAX);
      if (!cleanTitle) return;
      try {
        await addDoc(collection(db, 'tasks', taskId, 'subtasks'), {
          taskId,
          ownerId: authUser.uid,
          title: cleanTitle,
          completed: false,
          order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tasks/${taskId}/subtasks`);
      }
    },
    [authUser]
  );

  const toggleSubtask = useCallback(
    async (taskId: string, subtaskId: string, completed: boolean) => {
      if (!authUser) return;
      try {
        await updateDoc(doc(db, 'tasks', taskId, 'subtasks', subtaskId), {
          completed,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}/subtasks/${subtaskId}`);
      }
    },
    [authUser]
  );

  const deleteSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      if (!authUser) return;
      try {
        await deleteDoc(doc(db, 'tasks', taskId, 'subtasks', subtaskId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}/subtasks/${subtaskId}`);
      }
    },
    [authUser]
  );

  // --- Focus Sessions ---
  const logFocusSession = useCallback(
    async (taskId: string, durationMinutes: number, mode: FocusMode, currentLoggedMinutes: number) => {
      if (!authUser) return;
      const mins = Math.min(Math.max(Math.round(durationMinutes), 1), 180);
      try {
        const batch = writeBatch(db);
        const sessionRef = doc(collection(db, 'focusSessions'));
        batch.set(sessionRef, {
          taskId,
          ownerId: authUser.uid,
          durationMinutes: mins,
          mode,
          completedAt: serverTimestamp(),
        });
        if (mode === 'focus') {
          batch.update(doc(db, 'tasks', taskId), {
            loggedMinutes: Math.min(currentLoggedMinutes + mins, 100000),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'focusSessions');
      }
    },
    [authUser]
  );

  return {
    authUser,
    userProfile,
    authLoading,
    authError,
    dataLoading,
    projects,
    tasks,
    focusSessions,
    signInWithGoogle,
    signOutUser,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    subscribeSubtasks,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    logFocusSession,
  };
}
