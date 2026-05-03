import { ChatApp } from "@/components/chat-app";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-25%,rgba(20,184,166,0.14),transparent),radial-gradient(ellipse_50%_45%_at_100%_0%,rgba(16,185,129,0.07),transparent)]"
        aria-hidden
      />
      <header className="relative z-10 border-b border-zinc-800/60 px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-400/85">
              Document RAG
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
              PDF-constrained conversational agent
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
              Chat with uploaded PDFs using grounded answers and clear page
              citations, with support for multilingual responses.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:text-right">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Retrieval
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-300">Lexical</dd>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Chat
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-300">Groq Llama</dd>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Runtime
              </dt>
              <dd className="mt-0.5 font-medium text-zinc-300">Node</dd>
            </div>
          </dl>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        <ChatApp />
      </main>
    </div>
  );
}
