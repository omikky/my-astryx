const KEY = 'replyly-session';

export function isSignedIn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function signIn(email: string) {
  try {
    window.localStorage.setItem(KEY, email);
  } catch {
    // Storage can be blocked; the session then lasts until reload via the in-memory flag.
  }
  memory = email;
}

export function signOut() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore blocked storage.
  }
  memory = null;
}

let memory: string | null = null;

export function hasSession(): boolean {
  return memory !== null || isSignedIn();
}
