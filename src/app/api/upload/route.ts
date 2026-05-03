import { randomUUID } from "crypto";
import { getDocumentProxy, extractText } from "unpdf";
import { mapPdfEngineError } from "@/lib/ai-errors";
import { pagesToChunks } from "@/lib/chunk";
import { config, hasGroqConfigured } from "@/lib/config";
import { sanitizeChunksForEmbedding } from "@/lib/embedding-prep";
import { jsonError, jsonOk } from "@/lib/http";
import { hasPdfMagic, toPdfUint8Array } from "@/lib/pdf-bytes";
import { saveSession } from "@/lib/session-store";

export const runtime = "nodejs";

function safeFilename(name: string): string {
  return name.replace(/[^\w.\- ()\[\]]+/g, "_").slice(0, 180) || "document.pdf";
}

export async function POST(req: Request) {
  if (!hasGroqConfigured()) {
    return jsonError(
      "Server misconfiguration: set GROQ_API_KEY.",
      503,
      "MISSING_API_KEY",
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid multipart body", 400, "BAD_REQUEST");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError('Expected multipart field "file"', 400, "VALIDATION");
  }

  if (file.size > config.pdf.maxBytes) {
    return jsonError(
      `File too large (max ${config.pdf.maxBytes / (1024 * 1024)} MB)`,
      413,
      "PAYLOAD_TOO_LARGE",
    );
  }

  if (file.type && file.type !== "application/pdf") {
    return jsonError("Only PDF files are supported", 400, "VALIDATION");
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return jsonError("File must have a .pdf extension", 400, "VALIDATION");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (!hasPdfMagic(buf)) {
    return jsonError(
      "File is not a valid PDF (no %PDF- header found in the first part of the file).",
      400,
      "VALIDATION",
    );
  }

  const pdfBytes = toPdfUint8Array(buf);
  if (!pdfBytes) {
    return jsonError("Could not locate PDF data stream", 400, "VALIDATION");
  }

  let totalPages: number;
  let chunks: ReturnType<typeof pagesToChunks>;

  try {
    const pdf = await getDocumentProxy(pdfBytes);
    const { totalPages: pages, text } = await extractText(pdf, {
      mergePages: false,
    });
    totalPages = pages;
    const pageTexts = text.map((t) => t.replace(/\s+/g, " ").trim());
    chunks = pagesToChunks(pageTexts);
  } catch (e) {
    console.error("[upload] pdf parse", e);
    const mapped = mapPdfEngineError(e);
    return jsonError(mapped.message, mapped.status, mapped.code);
  }

  if (chunks.length === 0) {
    return jsonError(
      "Could not extract text from this PDF (it may be image-only or have no selectable text).",
      422,
      "UNPROCESSABLE",
    );
  }

  chunks = sanitizeChunksForEmbedding(chunks);
  if (chunks.length === 0) {
    return jsonError(
      "No embeddable text after cleaning (only empty or whitespace segments).",
      422,
      "UNPROCESSABLE",
    );
  }

  try {
    if (chunks.length > config.index.maxChunksPerDocument) {
      chunks = chunks.slice(0, config.index.maxChunksPerDocument);
    }

    const sessionId = randomUUID();
    saveSession(sessionId, {
      filename: safeFilename(file.name),
      pageCount: totalPages,
      chunks,
    });

    return jsonOk({
      sessionId,
      pageCount: totalPages,
      chunkCount: chunks.length,
      filename: file.name,
    });
  } catch (e) {
    console.error("[upload] session", e);
    return jsonError(
      "Failed to finalize document index. Try a smaller PDF.",
      500,
      "INDEX_FINALIZE",
    );
  }
}
