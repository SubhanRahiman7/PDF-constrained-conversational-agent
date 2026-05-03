"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { displayTextFromMessage } from "@/lib/message-text";
import { UploadPanel, type LocaleCode } from "./upload-panel";

function citeSegments(text: string) {
  const re = /\[Page\s*\d+[^\]]*\]/gi;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(<span key={`t-${key++}`}>{text.slice(last, m.index)}</span>);
    }
    out.push(
      <mark
        key={`c-${key++}`}
        className="rounded-md bg-teal-500/20 px-1 py-0.5 font-medium text-teal-200 not-italic"
      >
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push(<span key={`t-${key++}`}>{text.slice(last)}</span>);
  }
  return out;
}

export function ChatApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<{
    filename: string;
    pageCount: number;
    chunkCount: number;
  } | null>(null);
  const [locale, setLocale] = useState<LocaleCode>("en");
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          sessionId: sessionId ?? "",
          responseLanguage: locale,
        },
      }),
    [sessionId, locale],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sessionId ?? "pending",
    transport,
    messages: [] as UIMessage[],
  });

  useEffect(() => {
    setMessages([]);
  }, [sessionId, setMessages]);

  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <UploadPanel
        locale={locale}
        onLocaleChange={setLocale}
        sessionId={sessionId}
        docMeta={docMeta}
        onSession={(p) => {
          setSessionId(p.sessionId);
          setDocMeta({
            filename: p.filename,
            pageCount: p.pageCount,
            chunkCount: p.chunkCount,
          });
        }}
      />

      <section className="flex min-h-[520px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/45 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400/90" aria-hidden />
              <h1 className="text-base font-semibold tracking-tight text-zinc-50">
                PDF Insight
              </h1>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {sessionId
                ? "Retrieval-gated · Citations required · Abstention on weak match"
                : "Upload a PDF to enable chat."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${
                busy
                  ? "bg-amber-500/15 text-amber-200/90"
                  : sessionId
                    ? "bg-teal-500/15 text-teal-200/90"
                    : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {busy ? "Generating" : sessionId ? "Ready" : "Idle"}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!sessionId ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
                Ask anything about your uploaded PDF. Every factual answer is
                grounded in retrieved text and cited with{" "}
                <span className="font-medium text-teal-400/90">[Page N]</span>.
              </p>
              <p className="max-w-sm text-xs text-zinc-600">
                Powered by dual-model Groq routing for fast replies on simple
                questions and deeper reasoning for complex ones.
              </p>
              <p className="max-w-sm text-xs text-zinc-600">
                Configure models via{" "}
                <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-400">
                  GROQ_SIMPLE_MODEL
                </code>{" "}
                /{" "}
                <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-400">
                  GROQ_COMPLEX_MODEL
                </code>{" "}
                .
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(92%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                    m.role === "user"
                      ? "border border-teal-500/20 bg-teal-950/40 text-zinc-100"
                      : "border border-zinc-800/80 bg-zinc-950/80 text-zinc-200"
                  }`}
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {m.role === "user" ? "You" : "Assistant"}
                  </p>
                  <div className="whitespace-pre-wrap break-words">
                    {citeSegments(displayTextFromMessage(m))}
                  </div>
                </div>
              </div>
            ))
          )}
          {busy && sessionId ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin text-teal-500/80" />
                Reasoning over retrieved context…
              </div>
            </div>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error.message || "Request failed"}
            </p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-zinc-800/80 p-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("q") as HTMLInputElement;
              const v = input.value.trim();
              if (!v || !sessionId || busy) return;
              void sendMessage({ text: v });
              input.value = "";
            }}
          >
            <input
              name="q"
              disabled={!sessionId || busy}
              placeholder={
                sessionId
                  ? "Ask about the document…"
                  : "Upload a PDF to start…"
              }
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-teal-500/35 focus:ring-1 focus:ring-teal-500/15 disabled:opacity-45"
            />
            <button
              type="submit"
              disabled={!sessionId || busy}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-teal-950/30 transition-opacity disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <SendHorizonal className="h-4 w-4" aria-hidden />
              )}
              Send
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
