import {randomBytes, scrypt, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 30;
const COOKIE_NAME = 'replyly_session';
const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) {
    return false;
  }
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Used to keep login timing similar whether or not the email exists.
export const DUMMY_HASH = await hashPassword('not-a-real-password');

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    userId,
    expiresAt,
  );
  return {token, maxAgeSeconds: SESSION_DAYS * 24 * 60 * 60};
}

export function destroySession(db, token) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function readCookie(req, name = COOKIE_NAME) {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return null;
}

export function userFromRequest(db, req) {
  const token = readCookie(req);
  if (!token) {
    return null;
  }
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.business_name AS businessName, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(sha256(token));
  if (!row) {
    return null;
  }
  if (row.expiresAt < Date.now()) {
    destroySession(db, token);
    return null;
  }
  return {id: row.id, email: row.email, name: row.name, businessName: row.businessName};
}

export function sessionCookie(token, maxAgeSeconds, secure) {
  return [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    secure ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');
}

export function clearedCookie(secure) {
  return sessionCookie('', 0, secure);
}

// Simple in-memory limiter for failed logins (per IP + email).
export function createLoginLimiter() {
  const failures = new Map();
  const prune = (key, now) => {
    const list = (failures.get(key) ?? []).filter(t => now - t < WINDOW_MS);
    failures.set(key, list);
    return list;
  };
  return {
    isBlocked(key) {
      return prune(key, Date.now()).length >= MAX_FAILURES;
    },
    recordFailure(key) {
      const now = Date.now();
      prune(key, now).push(now);
    },
    reset(key) {
      failures.delete(key);
    },
  };
}
