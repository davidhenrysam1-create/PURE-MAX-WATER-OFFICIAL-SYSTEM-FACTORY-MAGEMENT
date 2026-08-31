/**
 * Profile-picture persistence for Pure Max Factory OS (Issue #10).
 *
 * WHY THIS EXISTS
 * ---------------
 * Uploading a profile picture did not survive a refresh. Three separate causes:
 *
 *  1. CLOUD MERGE CLOBBERED IT. AppContext.refreshCloudData() merges the
 *     server's user row over the local one with
 *         { ...localUser, ...serverUser }
 *     When Postgres is not configured (Google AI Studio) or the column is NULL,
 *     `serverUser.avatarUrl` is null/undefined, and that null overwrote the
 *     freshly uploaded local avatar. The image vanished on the next 8-second
 *     background sync.
 *
 *  2. localStorage IS THE WRONG PLACE. Avatars are base64 data URLs. They were
 *     written into the `users` array, which is serialised to localStorage on
 *     every change. localStorage has a ~5 MB budget shared across the whole
 *     origin, so a handful of pictures could blow the quota — and
 *     safeLocalStorageSet() swallows QuotaExceededError, meaning account edits
 *     silently stopped persisting too.
 *
 *  3. HYDRATION WAS LOGIN-ONLY. login() re-hydrated the avatar from
 *     `user_avatar_<employeeId>`, but a plain page refresh restored the session
 *     straight from `puremax_active_session_user_v5` without that step.
 *
 * THE FIX
 * -------
 * Avatars live in IndexedDB (effectively unbounded compared to localStorage),
 * keyed by employeeId, with a tiny localStorage mirror purely so the very first
 * paint has something to show before IndexedDB resolves.
 *
 * `stripAvatars()` / `rehydrateAvatars()` let AppContext persist a lean `users`
 * array to localStorage (quota-safe) while still restoring every picture after
 * a reload.
 */

import { idbStorage } from './indexedDBStorage';

const LS_PREFIX = 'user_avatar_';

/**
 * Session-tier avatar cache.
 *
 * WHY THIS EXISTS
 * ---------------
 * Google AI Studio (and GitHub Pages previews, and any `sandbox`-ed iframe)
 * can deny BOTH localStorage and IndexedDB - in an opaque origin every access
 * throws SecurityError, or storage is silently partitioned away. When that
 * happened the picture survived only until the next render, so it seemed to
 * vanish "immediately after page navigation".
 *
 * This Map is always available, is written synchronously on save, and is
 * consulted FIRST on read. It guarantees the picture never disappears for the
 * life of the page - which covers in-app navigation and tab switching. The
 * persistent tiers below still handle a genuine reload/restart when they are
 * permitted.
 */
const sessionAvatarCache = new Map<string, string>();

/** Synchronous localStorage mirror key for an employee. */
const mirrorKey = (employeeId: string) => `${LS_PREFIX}${employeeId}`;

const isUsable = (url?: string | null): url is string =>
  typeof url === 'string' && url.trim().length > 0;

/**
 * Persist a profile picture. IndexedDB is authoritative; the localStorage
 * mirror is best-effort so the first render already has the new image.
 */
export async function cacheAvatar(employeeId: string, dataUrl: string): Promise<void> {
  if (!employeeId || !isUsable(dataUrl)) return;

  // Session tier: synchronous and cannot fail.
  sessionAvatarCache.set(employeeId, dataUrl);

  try {
    await idbStorage.saveMediaItem(mirrorKey(employeeId), dataUrl);
  } catch (err) {
    console.warn('Avatar IndexedDB write failed:', err);
  }

  // Small avatars (compressed to ~500px webp) fit comfortably; only skip the
  // mirror when it is clearly too large for localStorage.
  try {
    if (dataUrl.length < 512 * 1024) {
      localStorage.setItem(mirrorKey(employeeId), dataUrl);
    } else {
      localStorage.removeItem(mirrorKey(employeeId));
    }
  } catch (err) {
    console.warn('Avatar localStorage mirror failed (non-fatal):', err);
  }
}

/** Synchronous read from the localStorage mirror (may be empty on first load). */
export function getCachedAvatarSync(employeeId?: string): string | undefined {
  if (!employeeId) return undefined;

  const fromSession = sessionAvatarCache.get(employeeId);
  if (isUsable(fromSession)) return fromSession;

  try {
    const value = localStorage.getItem(mirrorKey(employeeId));
    return isUsable(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Authoritative read from IndexedDB. */
export async function getCachedAvatar(employeeId?: string): Promise<string | undefined> {
  if (!employeeId) return undefined;

  const fromSession = sessionAvatarCache.get(employeeId);
  if (isUsable(fromSession)) return fromSession;

  try {
    const value = await idbStorage.getMediaItem(mirrorKey(employeeId));
    return isUsable(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function removeCachedAvatar(employeeId: string): void {
  sessionAvatarCache.delete(employeeId);
  try {
    localStorage.removeItem(mirrorKey(employeeId));
  } catch {
    /* ignore */
  }
}

export interface AvatarCarrier {
  employeeId?: string;
  id?: string;
  avatarUrl?: string;
}

/** Resolve the best available picture for a user right now (sync). */
export function resolveAvatarUrl<T extends AvatarCarrier>(user?: T | null): string | undefined {
  if (!user) return undefined;
  if (isUsable(user.avatarUrl)) return user.avatarUrl;
  return getCachedAvatarSync(user.employeeId);
}

/**
 * Remove picture data from a user list before serialising it to localStorage.
 * Used when the write would otherwise exceed the storage quota — account
 * records must always persist, even if that means re-fetching a photo.
 */
export function stripAvatars<T extends AvatarCarrier>(users: T[]): T[] {
  return users.map((u) => ({ ...u, avatarUrl: undefined }));
}

/**
 * Restore picture data that `stripAvatars()` removed, plus any picture the
 * user object itself is missing.
 */
export async function rehydrateAvatars<T extends AvatarCarrier>(users: T[]): Promise<T[]> {
  return Promise.all(
    users.map(async (u) => {
      if (isUsable(u.avatarUrl)) return u;
      const cached = await getCachedAvatar(u.employeeId);
      return cached ? { ...u, avatarUrl: cached } : u;
    })
  );
}

/**
 * Merge a server-supplied user into a local one WITHOUT letting a blank
 * server avatar erase a locally uploaded picture.
 */
export function mergeUserPreservingAvatar<T extends AvatarCarrier>(local: T, remote: Partial<T>): T {
  const merged: T = { ...local, ...remote };
  if (!isUsable(merged.avatarUrl)) {
    const cached = getCachedAvatarSync(local.employeeId);
    if (cached) merged.avatarUrl = cached;
  }
  return merged;
}
