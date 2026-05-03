import { config } from "./config";
import type { SessionDoc } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __pdfSessionStore: Map<string, SessionDoc> | undefined;
}

/**
 * Keep session storage on globalThis so Next.js dev hot-reloads do not wipe
 * uploaded sessions between /api/upload and /api/chat calls.
 */
const store = globalThis.__pdfSessionStore ?? new Map<string, SessionDoc>();
globalThis.__pdfSessionStore = store;

const { ttlMs: TTL_MS, maxConcurrent: MAX_SESSIONS } = config.session;

function pruneExpired() {
  const now = Date.now();
  for (const [id, doc] of store) {
    if (doc.expiresAt < now) store.delete(id);
  }
}

function evictOldestSessions() {
  while (store.size >= MAX_SESSIONS) {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, doc] of store) {
      if (doc.createdAt < oldestTime) {
        oldestTime = doc.createdAt;
        oldestId = id;
      }
    }
    if (oldestId) store.delete(oldestId);
    else break;
  }
}

export function saveSession(
  sessionId: string,
  doc: Omit<SessionDoc, "createdAt" | "expiresAt">,
) {
  pruneExpired();
  evictOldestSessions();

  const now = Date.now();
  const full: SessionDoc = {
    ...doc,
    createdAt: now,
    expiresAt: now + TTL_MS,
  };
  store.set(sessionId, full);
  return full;
}

export function getSession(sessionId: string): SessionDoc | undefined {
  pruneExpired();
  const doc = store.get(sessionId);
  if (!doc || doc.expiresAt < Date.now()) {
    store.delete(sessionId);
    return undefined;
  }
  return doc;
}
