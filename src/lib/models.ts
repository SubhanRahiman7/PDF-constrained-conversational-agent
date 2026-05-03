import { groq } from "@ai-sdk/groq";
import { config } from "./config";

function isComplexQuery(text: string): boolean {
  const t = text.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean).length;
  const complexHints = [
    "explain",
    "analyze",
    "compare",
    "summarize",
    "why",
    "how",
    "detail",
    "difference",
    "tradeoff",
  ];
  const hasHint = complexHints.some((h) => t.includes(h));
  return words > 18 || hasHint;
}

export function getGroqChatModelForQuery(queryText: string) {
  if (!process.env.GROQ_API_KEY?.trim()) return null;
  const modelId = isComplexQuery(queryText)
    ? config.models.groq.complex
    : config.models.groq.simple;
  return groq(modelId);
}
