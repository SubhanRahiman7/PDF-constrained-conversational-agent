import { APICallError } from "ai";

type MappedError = {
  message: string;
  status: number;
  code: string;
};

function pickMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(e);
}

function pickStatus(e: unknown): number | undefined {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.statusCode === "number") return o.statusCode;
    if (typeof o.status === "number") return o.status;
  }
  return undefined;
}

function apiDetail(e: unknown): string {
  if (!APICallError.isInstance(e) || !e.responseBody) return "";
  const raw = e.responseBody.trim();
  try {
    const j = JSON.parse(raw) as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    const inner = j.error?.message ?? j.message;
    if (typeof inner === "string" && inner.length > 0) return inner;
  } catch {
    /* use raw */
  }
  return raw.length > 600 ? `${raw.slice(0, 600)}…` : raw;
}

/** Turn provider failures into safe client messages. */
export function mapEmbeddingError(e: unknown): MappedError {
  const message = pickMessage(e);
  const status = pickStatus(e);
  const detail = apiDetail(e);
  const combined =
    detail && !message.toLowerCase().includes(detail.toLowerCase().slice(0, 40))
      ? `${message}${detail ? ` — ${detail}` : ""}`
      : detail || message;
  const lower = combined.toLowerCase();

  if (status === 401 || lower.includes("incorrect api key") || lower.includes("invalid api key")) {
    return {
      message:
        "The Groq API key was rejected (401). Check GROQ_API_KEY.",
      status: 401,
      code: "AI_UNAUTHORIZED",
    };
  }
  if (status === 429 || lower.includes("rate limit")) {
    return {
      message:
        "Provider rate limit hit. Wait a moment and try again.",
      status: 429,
      code: "AI_RATE_LIMIT",
    };
  }
  if (
    status === 402 ||
    lower.includes("insufficient_quota") ||
    lower.includes("billing")
  ) {
    return {
      message:
        "Provider billing or quota issue. Add credits or check plan limits.",
      status: 402,
      code: "AI_QUOTA",
    };
  }
  if (
    lower.includes("context length") ||
    lower.includes("too many tokens") ||
    lower.includes("maximum context") ||
    lower.includes("token limit")
  ) {
    return {
      message:
        "One or more text chunks were too large for the embedding model. They are truncated server-side; if this persists, lower maxCharsPerEmbedding or chunk size.",
      status: 422,
      code: "AI_CONTEXT",
    };
  }
  if (
    lower.includes("model") &&
    (lower.includes("not found") || lower.includes("does not exist") || lower.includes("invalid"))
  ) {
    return {
      message: `Embedding model rejected by provider — ${detail || combined}.`,
      status: status === 400 ? 400 : 422,
      code: "AI_MODEL_INVALID",
    };
  }

  const http = status && status >= 400 && status < 600 ? status : 502;

  return {
    message: `Embedding failed: ${combined.slice(0, 480)}`,
    status: http,
    code: "AI_EMBED_FAILED",
  };
}

export function mapPdfEngineError(e: unknown): MappedError {
  const message = pickMessage(e);
  const lower = message.toLowerCase();

  if (lower.includes("password") || lower.includes("encrypt")) {
    return {
      message:
        "This PDF is password-protected or encrypted. Remove protection and try again.",
      status: 422,
      code: "PDF_ENCRYPTED",
    };
  }
  if (lower.includes("invalid pdf") || lower.includes("bad xref")) {
    return {
      message: "The file could not be parsed as a PDF (corrupt or not a real PDF).",
      status: 422,
      code: "PDF_PARSE",
    };
  }

  return {
    message: `PDF engine error: ${message.slice(0, 240)}`,
    status: 500,
    code: "PDF_ENGINE",
  };
}
