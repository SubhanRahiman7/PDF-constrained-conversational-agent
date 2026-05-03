import type { TextChunk } from "./types";

const DEFAULT_MAX = 880;
const DEFAULT_OVERLAP = 120;

/**
 * Uniformly downsample so `chunks` and `embeddings` stay aligned (same indices).
 */
export function downsampleIndexed<T>(
  chunks: T[],
  embeddings: number[][],
  max: number,
): { chunks: T[]; embeddings: number[][] } {
  if (chunks.length <= max || chunks.length !== embeddings.length) {
    return { chunks, embeddings };
  }

  const step = chunks.length / max;
  const nc: T[] = [];
  const ne: number[][] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.min(chunks.length - 1, Math.floor(i * step));
    nc.push(chunks[idx]);
    ne.push(embeddings[idx]);
  }
  return { chunks: nc, embeddings: ne };
}

/**
 * Split per-page PDF text into overlapping chunks while preserving page numbers for citations.
 */
export function pagesToChunks(
  pageTexts: string[],
  maxLen = DEFAULT_MAX,
  overlap = DEFAULT_OVERLAP,
): TextChunk[] {
  const chunks: TextChunk[] = [];

  pageTexts.forEach((raw, pageIdx) => {
    const page = pageIdx + 1;
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) return;

    let start = 0;
    let seq = 0;
    while (start < text.length) {
      let end = Math.min(start + maxLen, text.length);
      if (end < text.length) {
        const slice = text.slice(start, end);
        const lastSpace = slice.lastIndexOf(" ");
        if (lastSpace > maxLen * 0.45) {
          end = start + lastSpace;
        }
      }

      const piece = text.slice(start, end).trim();
      if (piece.length > 0) {
        chunks.push({ id: `p${page}-${seq}`, page, text: piece });
        seq += 1;
      }

      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  });

  return chunks;
}
