/**
 * Safe LocalStorage Utility for Pure Max Factory OS
 * Wraps localStorage operations in try/catch to guarantee no unhandled QuotaExceededError crashes.
 */

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // If parsing fails and fallback is a string (or null), return the raw string.
        // This handles cases where safeLocalStorageSet saved a raw string without JSON.stringify.
        return (saved as unknown) as T;
      }
    }
  } catch (e) {
    console.warn(`safeLocalStorageGet failed for key "${key}":`, e);
  }
  return fallback;
}

export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e: any) {
    console.warn(`safeLocalStorageSet quota exceeded or error for key "${key}":`, e);

    // If quota exceeded, attempt to clear transient/old cache keys to recover
    try {
      if (
        e.name === 'QuotaExceededError' ||
        e.code === 22 ||
        e.code === 1014 ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ) {
        // Evict non-critical temporary telemetry / large chat caches
        const keysToEvict = [
          'puremax_system_health_telemetry_cache',
          'puremax_temp_image_cache',
          'puremax_chat_drafts',
        ];
        keysToEvict.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {
            // ignore
          }
        });

        // Retry saving critical record
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
      }
    } catch (retryErr) {
      console.error(`Failed to recover localStorage quota for key "${key}":`, retryErr);
    }
    return false;
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`safeLocalStorageRemove failed for key "${key}":`, e);
  }
}
