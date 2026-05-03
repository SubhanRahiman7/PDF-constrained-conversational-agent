"use client";

import { BookOpen, FileUp, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

type Props = {
  locale: LocaleCode;
  onLocaleChange: (code: LocaleCode) => void;
  sessionId: string | null;
  docMeta: { filename: string; pageCount: number; chunkCount: number } | null;
  onSession: (payload: {
    sessionId: string;
    filename: string;
    pageCount: number;
    chunkCount: number;
  }) => void;
};

export function UploadPanel({
  locale,
  onLocaleChange,
  sessionId,
  docMeta,
  onSession,
}: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ingestFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setUploadError("Please choose a PDF file.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`File too large. Max allowed size is ${MAX_UPLOAD_MB} MB.`);
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setUploading(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: fd,
          signal: ac.signal,
        });
        const data = (await res.json()) as {
          sessionId?: string;
          pageCount?: number;
          chunkCount?: number;
          filename?: string;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          setUploadError(data.error ?? "Upload failed");
          return;
        }
        if (!data.sessionId) {
          setUploadError("Invalid server response");
          return;
        }
        onSession({
          sessionId: data.sessionId,
          filename: data.filename ?? file.name,
          pageCount: data.pageCount ?? 0,
          chunkCount: data.chunkCount ?? 0,
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setUploadError("Network error during upload");
      } finally {
        setUploading(false);
      }
    },
    [onSession],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) void ingestFile(f);
    },
    [ingestFile],
  );

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-xl shadow-black/20 backdrop-blur-xl lg:max-w-[340px]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
          <FileUp className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            Document ingest
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Upload a PDF to start grounded Q&A with page-based citations.
            Sessions are time-limited and managed safely for consistent
            performance.
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-12 transition-all ${
          dragOver
            ? "border-teal-400/70 bg-teal-500/10"
            : "border-zinc-700/80 bg-zinc-950/50 hover:border-teal-500/35 hover:bg-zinc-950/70"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void ingestFile(f);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-teal-400/90" aria-hidden />
        ) : (
          <FileUp className="h-10 w-10 text-zinc-600 transition-colors group-hover:text-teal-500/80" aria-hidden />
        )}
        <p className="mt-4 text-center text-sm font-medium text-zinc-200">
          {uploading ? "Indexing & embedding…" : "Drop PDF or click to upload"}
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-500">
          Max 10 MB · Validated header · Chunk cap 2k
        </p>
      </div>

      {uploadError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200"
        >
          {uploadError}
        </p>
      ) : null}

      {docMeta && sessionId ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3">
          <p
            className="truncate text-sm font-medium text-zinc-100"
            title={docMeta.filename}
          >
            {docMeta.filename}
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-500">
            {docMeta.pageCount} pp · {docMeta.chunkCount} vectors · session{" "}
            <span className="text-zinc-400">{sessionId.slice(0, 8)}…</span>
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Response language
        </label>
        <select
          value={locale}
          onChange={(e) =>
            onLocaleChange(e.target.value as LocaleCode)
          }
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20"
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Replies follow this locale while staying grounded on source text.
        </p>
      </div>

    </aside>
  );
}
