/**
 * Central limits and model defaults. Override models via env in production.
 */
export const config = {
  pdf: {
    // Hard upload cap to prevent very large PDF ingestion.
    maxBytes: 10 * 1024 * 1024,
  },
  index: {
    maxChunksPerDocument: 2_000,
    /** Rough cap for lexical index stability and memory use. */
    maxCharsPerEmbedding: 8000,
  },
  retrieval: {
    topK: 6,
    minScore: 0.32,
    /** Include chunk if score ≥ minScore * this ratio (slightly below hard cutoff) */
    contextScoreRatio: 0.92,
    maxChunksPerPage: 3,
  },
  session: {
    ttlMs: 60 * 60 * 1000,
    maxConcurrent: 400,
  },
  chat: {
    maxUserChars: 12_000,
    temperature: 0.15,
    maxDurationSec: 60,
  },
  models: {
    groq: {
      simple: process.env.GROQ_SIMPLE_MODEL ?? "llama-3.1-8b-instant",
      complex: process.env.GROQ_COMPLEX_MODEL ?? "llama-3.3-70b-versatile",
    },
  },
} as const;

export function hasGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}
