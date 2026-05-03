# PDF-Grounded Conversational Agent

A production-style web application for **question answering strictly over user-uploaded PDFs**. The stack combines **Next.js** (App Router), **server-side PDF ingestion**, **lexical retrieval** with per-page diversity, and **Groq-hosted large language models** via the **Vercel AI SDK**. Responses are grounded in retrieved passages and include **page-level citations**; when evidence is insufficient, the system **abstains** rather than inventing content from the open web.

## Capabilities

- **Validated PDF upload** — Multipart ingest with size and format checks, text extraction via `unpdf`, and chunking for indexing.
- **Session-scoped index** — Each upload receives a server-side session; retrieved context is limited to that document’s chunks.
- **Retrieval-gated generation** — Token-overlap scoring with configurable thresholds; low-confidence queries route to a **refusal** prompt instead of a grounded answer.
- **Streaming chat** — Token streaming to the browser through `POST /api/chat` using the AI SDK message protocol.
- **Internationalization hooks** — Client-selectable response language passed to the model context.
- **Upstash Redis (production)** — PDF chunk sessions are stored via **[Upstash](https://upstash.com) serverless Redis** (`@upstash/redis`, REST API) so uploads and chat work across Vercel’s stateless function instances (see below).

## Session storage: Upstash Redis

This project uses **[Upstash Redis](https://upstash.com)** as the **session backend** when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.

| Topic | Detail |
|--------|--------|
| **Why** | On **Vercel**, `/api/upload` and `/api/chat` can run on **different** serverless instances. An in-memory `Map` is not shared, which causes `SESSION_NOT_FOUND` after upload. Upstash provides a **shared** key-value store over HTTPS. |
| **What we store** | Per-session JSON (chunk text + metadata), **gzip-compressed** and base64-encoded under keys `pdfchat:v1:{sessionId}`, with TTL aligned to the app’s session lifetime. |
| **Dependency** | [`@upstash/redis`](https://github.com/upstash/upstash-redis-js) — see `src/lib/session-store.ts`. |
| **Local dev** | Redis is **optional**. Without those env vars, the app uses **in-memory** storage (and `globalThis` so hot reload does not drop sessions). |
| **Setup** | Create a free Redis database in the Upstash console, copy the **REST URL** and **REST token**, add them to Vercel (and optionally `.env.local`), then redeploy. |

## Architecture (summary)

| Layer | Responsibility |
|--------|----------------|
| **Client** | Upload UI, chat transcript, locale selection; calls Next.js API routes. |
| **`POST /api/upload`** | Parse PDF, extract text, chunk, persist session payload (**Upstash Redis** on serverless; in-memory locally). |
| **`POST /api/chat`** | Resolve session, run retrieval over chunks, assemble system prompt (grounded vs refusal), stream Groq completion. |
| **Groq** | Chat completions (`GROQ_API_KEY`); model selection can follow query complexity (see `src/lib/models.ts`). |

## Prerequisites

- **Node.js** 20.x or newer (recommended for Next.js 16)
- **npm** (or compatible package manager)
- **Groq API key** — [Groq Console](https://console.groq.com/)

## Configuration

Copy the example environment file and set your key:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | API key for Groq inference. |
| `UPSTASH_REDIS_REST_URL` | On Vercel / serverless | REST URL from [Upstash](https://upstash.com); required so `/api/upload` and `/api/chat` share sessions. |
| `UPSTASH_REDIS_REST_TOKEN` | On Vercel / serverless | REST token (pair with URL above). |
| `GROQ_SIMPLE_MODEL` | No | Defaults to `llama-3.1-8b-instant`. |
| `GROQ_COMPLEX_MODEL` | No | Defaults to `llama-3.3-70b-versatile`. |

Never commit `.env.local` or real secrets.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Upload** to attach a PDF, then ask questions in the chat panel.

```bash
npm run build   # production build
npm run start   # run production server locally
npm run lint    # ESLint
```

## API contract (overview)

- **`POST /api/upload`** — `multipart/form-data` field `file` (PDF). Returns JSON with `sessionId`, `pageCount`, `chunkCount`, and `filename` on success.
- **`POST /api/chat`** — JSON body: `sessionId` (UUID), `messages` (AI SDK UI message shape), optional `responseLanguage`. Returns a **UI message stream** (`text/event-stream`).

Errors return JSON with `error` and optional `code` (see `src/lib/http.ts`).

## Deployment

The application is designed for **Vercel** or any Node-compatible host. Set `GROQ_API_KEY` (and optional model overrides) in the host’s environment. Ensure **request body size limits** allow your maximum PDF upload (see `src/lib/config.ts` for `pdf.maxBytes`).

**Production sessions:** See **[Session storage: Upstash Redis](#session-storage-upstash-redis)**. Set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** for **Production** (and Preview if needed), then **redeploy**.

**Verify:** `GET /api/health` returns `{"ok":true,"sessionStore":"redis"}` when Upstash is configured. `"memory"` means Redis env is missing—expect `SESSION_NOT_FOUND` on Vercel until fixed.

## Project layout

```
src/
  app/
    api/upload/route.ts   # PDF ingest and session creation
    api/chat/route.ts     # Retrieval, prompting, streaming
    page.tsx              # Entry page
  components/             # Upload and chat UI
  lib/                    # Chunking, retrieval, prompts, Groq models, session store (Upstash + memory)
```
