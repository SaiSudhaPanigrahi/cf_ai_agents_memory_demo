# cf_ai_agents_memory_demo

An **AI-powered Cloudflare app** demonstrating:
- **LLM**: Cloudflare Workers AI (Llama 3.x Instruct).
- **Workflow/coordination**: Orchestrated in a **Worker** with a **Durable Object** coordinator.
- **User input**: **Chat UI** on **Pages** with **optional voice** (Web Speech API).
- **Memory/state**: **Durable Object** stores per-session conversation history + lightweight long-term memory.

> This repository is intentionally minimal, deployable, and easy to review.

---

## Architecture

```
Pages (frontend) ──▶ Worker (HTTP API)
                         │
                         ├─▶ Workers AI (LLM: @cf/meta/llama-3.3-70b-instruct or similar)
                         └─▶ Durable Object (MemoryDO)  ← stores chat history + embeddings summary
```

- **Frontend (Pages)**: Simple chat UI with mic button for optional browser voice input.
- **Worker**:
  - Endpoints: `/api/chat` for chat turns, `/api/health` for readiness.
  - Uses **AI binding** (`ai`) to call Workers AI with chat messages.
  - **Durable Object `MemoryDO`** persists chat history and stores a rolling **summary** for context.
- **Memory strategy**:
  - Keep the last N turns verbatim (default 12).
  - Maintain/refresh a concise summary (long-term memory) after each turn.
- **Coordination**:
  - The Worker acts as the orchestrator: it fetches memory from `MemoryDO`, builds the prompt, calls LLM, updates memory.

> You can extend this to use **Cloudflare Workflows** later; the current orchestration via Worker + DO satisfies the “Workflow/coordination” requirement.

---

## Prerequisites

- Node.js 18+
- `pnpm` or `npm`
- Cloudflare account
- `wrangler` v3+ (`npm i -g wrangler`)
- Access to **Workers AI** in your account
- A **Durable Objects** namespace (wrangler will migrate for you)

---

## Quick start (local dev)

1) Install deps:
```bash
pnpm i
# or
npm i
```

2) Start dev (Workers + Pages preview):
```bash
wrangler dev --local
```

This runs your Worker on localhost and serves the `frontend/` folder at `/` (via static assets).

Open: http://localhost:8787

---

## Deploy

```bash
# First-time: creates DO namespace + migrations
wrangler deploy
```

After deploy, your app is available at the Worker URL. You can also host the `frontend/` on **Pages**;
for simplicity we serve it from the Worker as static assets.

---

## Configure model

By default, the Worker targets a Llama 3.x Instruct model.
Update the `MODEL` constant in `src/worker.ts` to use a model available to your account, e.g.:

- `@cf/meta/llama-3.3-70b-instruct`
- `@cf/meta/llama-3.1-8b-instruct`

> Check your Workers AI catalog for the exact identifier.

---

## Environment bindings

This project uses **wrangler.toml** bindings:

- `ai` — Workers AI binding
- `durable_objects` — MemoryDO
- `d1` (optional) — not used by default; feel free to add for analytics

No secrets required for the base demo.

---

## API

- `POST /api/chat`
  - JSON: `{ sessionId: string, user: string, text: string }`
  - Returns: `{ reply: string, sessionId: string, memory: { turns: number, summaryTokens: number } }`

- `GET /api/health`
  - Returns `200 OK` if Worker is running.

---

## Frontend

- **index.html**: chat UI with text input + mic button.
- **script.js**: calls `/api/chat`; provides optional **voice input** via Web Speech API (speech-to-text in browser).
- **style.css**: minimal styles.

---

## Memory policy

- Persist last **12** turns verbatim.
- Keep/update a **summary** (LLM-generated) in the Durable Object for continuity beyond 12 turns.
- You can tune these values in **`MemoryDO`**.

---

## Originality

All code in this repository is **original** for this assignment. AI assistance was used for scaffolding and documentation quality. See **PROMPTS.md** for prompt history.

---

## Rename the repository

The assignment requires the repo name to be prefixed with `cf_ai_`.

If you download this zip and push to your GitHub:
- Name it, e.g., `cf_ai_agents_memory_demo` (already follows the rule).

---

## License

MIT
