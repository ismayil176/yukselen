export function readBrowserValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const local = window.localStorage.getItem(key);
    if (local != null) return local;
  } catch {}
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserValue(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
}

export function removeBrowserValue(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

export function readBrowserJson<T>(key: string): T | null {
  const value = readBrowserValue(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function writeBrowserJson<T>(key: string, value: T): void {
  writeBrowserValue(key, JSON.stringify(value));
}
