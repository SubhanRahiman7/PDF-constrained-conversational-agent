import { config } from "./config";
import type { TextChunk } from "./types";

/**
 * Embedding APIs reject empty strings and may error on very long inputs.
 * Keeps chunk metadata; only text is trimmed/truncated.
 */
export function sanitizeChunksForEmbedding(chunks: TextChunk[]): TextChunk[] {
  const max = config.index.maxCharsPerEmbedding;

  return chunks
    .map((c) => ({
      ...c,
      text: c.text.replace(/\0/g, "").trim(),
    }))
    .filter((c) => c.text.length > 0)
    .map((c) => ({
      ...c,
      text: c.text.length > max ? c.text.slice(0, max) : c.text,
    }));
}
