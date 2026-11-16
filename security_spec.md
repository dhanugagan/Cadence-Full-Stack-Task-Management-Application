# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`projects`, `tasks`, `subtasks`, `focusSessions`, `users`) MUST enforce `ownerId == request.auth.uid` (or `uid == request.auth.uid`) on creation and keep `ownerId` / `uid` immutable on updates.
2. **Verified Auth Only**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Referential Integrity (Master Gate)**:
   - A `Task` cannot be created without an existing parent `Project` owned by `request.auth.uid`.
   - A `Subtask` cannot be created or modified unless its parent `Task` exists and belongs to `request.auth.uid`.
   - A `FocusSession` cannot be logged without an existing `Task` owned by `request.auth.uid`.
4. **PII Isolation**: Email addresses live exclusively under `/users/{userId}/private/{docId}`, readable and writable only by `userId == request.auth.uid` or verified admin.
5. **Immutable Timestamps & Audit Fields**: `createdAt` is locked to `request.time` at creation and cannot be altered; `updatedAt` must equal `request.time` on every mutation.
6. **Terminal State Locking**: Tasks moved to `status == 'archived'` cannot be modified afterward except by an admin. `FocusSession` records are append-only (immutable after creation).
7. **Self-Assigned Role Prevention**: Users cannot create `/users/{userId}` with `role == 'admin'` unless their UID exists in `/admins/{uid}`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Task Create**: Adding `isVerified: true` to `/tasks/{taskId}` -> Denied by `keys().hasOnly(...)`.
2. **Identity Spoofing on Task Create**: Setting `ownerId: "victim_uid"` while authenticated as `"attacker_uid"` -> Denied by `incoming().ownerId == request.auth.uid`.
3. **Orphaned Task Creation**: Creating a task with non-existent `projectId: "ghost_project"` -> Denied by `exists(/databases/.../projects/ghost_project)`.
4. **Cross-Tenant Project Hijack**: Creating a task referencing another user's `projectId` -> Denied by `get(...).data.ownerId == request.auth.uid`.
5. **Path ID Poisoning**: Creating `/tasks/../../etc/passwd` or 500-char ID -> Denied by `isValidId(taskId)`.
6. **Denial-of-Wallet String Bloat**: Setting `title` to a 50KB string -> Denied by `data.title.size() <= 160`.
7. **Unbounded Tag Array / Type Poisoning**: Sending `tags: [123, 456]` or 25 tags -> Denied by `data.tags.size() <= 8 && data.tags[0] is string`.
8. **Client-Spoofed Timestamp**: Sending `createdAt: Timestamp.fromDate(new Date(0))` -> Denied by `incoming().createdAt == request.time`.
9. **Self-Escalated Admin Role**: Creating `/users/attacker` with `role: "admin"` -> Denied by `incoming().role == 'member'`.
10. **PII Blanket Read Attempt**: Reading `/users/victim/private/info` as `"attacker_uid"` -> Denied by `isOwner(userId)`.
11. **Terminal State Tampering**: Updating a task after `existing().status == 'archived'` -> Denied by terminal lock.
12. **Unverified Email Write**: Attempting write when `request.auth.token.email_verified == false` -> Denied by `isEmailVerified()`.
