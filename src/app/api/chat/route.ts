import {
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { config, hasGroqConfigured } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { textFromUserMessage } from "@/lib/message-text";
import { getGroqChatModelForQuery } from "@/lib/models";
import { groundedSystemPrompt, refusalSystemPrompt } from "@/lib/prompts";
import {
  retrieveTopKDiverseByText,
  RETRIEVAL_MIN_SCORE,
} from "@/lib/retrieve";
import { getSession } from "@/lib/session-store";

export const runtime = "nodejs";
/** Keep in sync with `config.chat.maxDurationSec` (must be analyzable at build time). */
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  sessionId: z.string().uuid(),
  responseLanguage: z.string().min(2).max(12).optional(),
});

export async function POST(req: Request) {
  if (!hasGroqConfigured()) {
    return jsonError(
      "Server misconfiguration: set GROQ_API_KEY.",
      503,
      "MISSING_API_KEY",
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400, "BAD_REQUEST");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, "VALIDATION");
  }

  const { sessionId, responseLanguage = "en" } = parsed.data;
  const messages = parsed.data.messages as UIMessage[];

  const session = await getSession(sessionId);
  if (!session) {
    return jsonError(
      "Session expired or unknown. Upload your PDF again.",
      404,
      "SESSION_NOT_FOUND",
    );
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  let queryText = lastUser ? textFromUserMessage(lastUser) : "";
  if (queryText.length > config.chat.maxUserChars) {
    queryText = queryText.slice(0, config.chat.maxUserChars);
  }

  let system: string;

  if (!queryText) {
    system = refusalSystemPrompt(responseLanguage, session.filename);
  } else {
    const top = retrieveTopKDiverseByText(
      queryText,
      session.chunks,
      config.retrieval.topK,
      config.retrieval.maxChunksPerPage,
    );
    const best = top[0]?.score ?? 0;

    if (best < RETRIEVAL_MIN_SCORE) {
      system = refusalSystemPrompt(responseLanguage, session.filename);
    } else {
      const minCtx = RETRIEVAL_MIN_SCORE * config.retrieval.contextScoreRatio;
      const contextBlock = top
        .filter((t) => t.score >= minCtx)
        .map(({ chunk }) => `[Page ${chunk.page}]\n${chunk.text}`)
        .join("\n\n---\n\n");

      system = groundedSystemPrompt(
        responseLanguage,
        session.filename,
        contextBlock,
      );
    }
  }

  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch {
    return jsonError("Invalid message history", 400, "INVALID_MESSAGES");
  }

  const chatModel = getGroqChatModelForQuery(queryText);
  if (!chatModel) {
    return jsonError("No chat provider configured.", 503, "MISSING_API_KEY");
  }

  const result = streamText({
    model: chatModel,
    temperature: config.chat.temperature,
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
