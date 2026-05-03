import { config } from "./config";
import type { TextChunk } from "./types";

export type ScoredChunk = { chunk: TextChunk; score: number };

/**
 * Lexical retrieval (token overlap) with per-page diversity.
 * This avoids external embedding dependencies while keeping strict grounding.
 */
export function retrieveTopKDiverseByText(
  queryText: string,
  chunks: TextChunk[],
  k: number,
  maxPerPage: number,
): ScoredChunk[] {
  if (chunks.length === 0) return [];

  const qTokens = new Set(tokenize(queryText));
  if (qTokens.size === 0) return [];

  const scored: ScoredChunk[] = chunks.map((chunk) => {
    const cTokens = tokenize(chunk.text);
    if (cTokens.length === 0) return { chunk, score: 0 };

    let overlap = 0;
    for (const t of cTokens) {
      if (qTokens.has(t)) overlap += 1;
    }
    const score = overlap / Math.sqrt(cTokens.length * qTokens.size);
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: ScoredChunk[] = [];
  const pageUses = new Map<number, number>();

  for (const item of scored) {
    if (picked.length >= k) break;
    const used = pageUses.get(item.chunk.page) ?? 0;
    if (used >= maxPerPage) continue;
    pageUses.set(item.chunk.page, used + 1);
    picked.push(item);
  }

  return picked;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export const RETRIEVAL_MIN_SCORE = Math.max(0.08, config.retrieval.minScore * 0.32);
