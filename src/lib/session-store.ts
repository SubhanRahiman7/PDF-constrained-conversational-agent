import { Redis } from "@upstash/redis";
import { gzipSync, gunzipSync } from "node:zlib";

import { config } from "./config";
import type { SessionDoc } from "./types";

declare global {
  var __pdfSessionStore: Map<string, SessionDoc> | undefined;
}

/**
 * Keep session storage on globalThis so Next.js dev hot-reloads do not wipe
 * uploaded sessions between /api/upload and /api/chat calls (local dev only).
 */
const store = globalThis.__pdfSessionStore ?? new Map<string, SessionDoc>();
globalThis.__pdfSessionStore = store;

const { ttlMs: TTL_MS, maxConcurrent: MAX_SESSIONS } = config.session;
const TTL_SEC = Math.max(60, Math.ceil(TTL_MS / 1000));
const REDIS_KEY = (id: string) => `pdfchat:v1:${id}`;

let redisSingleton: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  redisSingleton = url && token ? new Redis({ url, token }) : null;
  return redisSingleton;
}

function pruneExpiredMemory() {
  const now = Date.now();
  for (const [id, doc] of store) {
    if (doc.expiresAt < now) store.delete(id);
  }
}

function evictOldestSessionsMemory() {
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

function encodeSession(doc: SessionDoc): string {
  const json = JSON.stringify(doc);
  const gz = gzipSync(Buffer.from(json, "utf8"));
  return gz.toString("base64");
}

function decodeSession(raw: string): SessionDoc {
  const buf = Buffer.from(raw, "base64");
  const json = gunzipSync(buf).toString("utf8");
  return JSON.parse(json) as SessionDoc;
}

export async function saveSession(
  sessionId: string,
  doc: Omit<SessionDoc, "createdAt" | "expiresAt">,
): Promise<SessionDoc> {
  const now = Date.now();
  const full: SessionDoc = {
    ...doc,
    createdAt: now,
    expiresAt: now + TTL_MS,
  };

  const redis = getRedis();
  if (redis) {
    try {
      const payload = encodeSession(full);
      await redis.set(REDIS_KEY(sessionId), payload, { ex: TTL_SEC });
    } catch (e) {
      console.error("[session-store] redis set failed", e);
      throw e;
    }
    return full;
  }

  pruneExpiredMemory();
  evictOldestSessionsMemory();
  store.set(sessionId, full);
  return full;
}

export async function getSession(
  sessionId: string,
): Promise<SessionDoc | undefined> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(REDIS_KEY(sessionId));
      if (raw == null || raw === "") return undefined;
      const doc = decodeSession(raw);
      if (doc.expiresAt < Date.now()) {
        await redis.del(REDIS_KEY(sessionId));
        return undefined;
      }
      return doc;
    } catch (e) {
      console.error("[session-store] redis get failed", e);
      return undefined;
    }
  }

  pruneExpiredMemory();
  const doc = store.get(sessionId);
  if (!doc || doc.expiresAt < Date.now()) {
    store.delete(sessionId);
    return undefined;
  }
  return doc;
}
