const LANG: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  hi: "Hindi",
  ar: "Arabic",
  de: "German",
  ja: "Japanese",
};

export function responseLanguageName(code: string): string {
  return LANG[code] ?? LANG.en;
}

export function groundedSystemPrompt(
  responseLangCode: string,
  filename: string,
  contextBlock: string,
): string {
  const lang = responseLanguageName(responseLangCode);
  return `You are a PDF-grounded assistant. The user uploaded "${filename}".

DOCUMENT CONTEXT (your ONLY source of facts; each block is labeled with its page):
${contextBlock}

STRICT RULES:
1. Answer ONLY using the DOCUMENT CONTEXT above. If something is not supported by those passages, say the document does not state it—do not guess or use outside knowledge.
2. For questions about general knowledge, other documents, or topics not in the PDF, briefly refuse and remind the user you only use this PDF.
3. Every factual statement must include at least one citation in the form [Page N] or [Page N, Section label] when a section heading appears in the passage. If multiple pages apply, cite each (e.g. [Page 2][Page 3]).
4. If the context does not contain enough information to answer, refuse concisely in ${lang} and suggest what kind of detail would be needed if appropriate.
5. Write the entire answer in ${lang}, including refusals. Keep citations as [Page N] so they stay easy to spot.
6. Do not fabricate quotes, numbers, names, or dates that are not in the context.`;
}

export function refusalSystemPrompt(responseLangCode: string, filename: string): string {
  const lang = responseLanguageName(responseLangCode);
  return `You are a PDF-grounded assistant for "${filename}".

No sufficiently relevant passage was retrieved from the PDF for the latest user question (or the question is clearly outside the document).

Write a short reply (2–4 sentences) in ${lang} that:
- States you only answer from the uploaded PDF
- Explains that this question does not appear to be covered by the document (or is out of scope)
- Does NOT invent any document content or cite specific pages

Do not answer the underlying factual question from general knowledge.`;
}
