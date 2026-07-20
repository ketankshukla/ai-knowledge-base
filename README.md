# 📚 AI Knowledge Base

[![CI](https://github.com/ketankshukla/ai-knowledge-base/actions/workflows/ci.yml/badge.svg)](https://github.com/ketankshukla/ai-knowledge-base/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)
[![Deployed on Vercel](https://img.shields.io/badge/deployed-vercel-black.svg)](https://ai-knowledge-base-red.vercel.app)

✨ A signed-in knowledge base: upload or paste documents, chat with them, and get answers grounded in your own content with citations — conversations and documents persist per user, isolated by Postgres Row Level Security.

🔗 **Live URL:** https://ai-knowledge-base-red.vercel.app

📚 **Companion docs:**
- 📖 [`USER_GUIDE.md`](./USER_GUIDE.md) — how to use the app, example inputs that work, and troubleshooting
- 🔬 [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) — end-to-end technical deep dive into auth, ingest, and retrieval
- 🧠 [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md) — the reasoning behind how this was built, plus a checklist for starting a project like this from scratch
- 🧩 [`PROJECT_STANDARDS.md`](./PROJECT_STANDARDS.md) — the shared style guide and file checklist used across this whole project series

📸 *(Screenshot placeholder — add one after your next deploy.)*

## 🛠️ Tech stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS** — UI and API routes.
- **Supabase** — Auth (Google OAuth), Postgres, and `pgvector`, via `@supabase/supabase-js` and `@supabase/ssr`.
- **OpenAI (`text-embedding-3-small`)** — embeddings for document chunks and chat questions.
- **Anthropic Claude (`claude-sonnet-5`)** — generates grounded answers from retrieved context.
- **Vitest** — unit tests for chunking and input validation.
- **Vercel** — hosting, deployed via GitHub integration (push to `master` auto-deploys).

## 🎯 What it does

- Sign in with Google.
- Upload a `.txt`/`.md` file or paste text as a document.
- The app chunks the document, embeds each chunk with OpenAI, and stores the vectors in Postgres (pgvector).
- Ask a question in the chat panel — the app embeds the question, finds the most similar chunks via cosine-similarity search, and asks Claude to answer **only** from that context, citing which chunks it used.
- Conversations and messages persist and are listed in a sidebar; switching between them reloads the full message history.
- Row Level Security guarantees every user only ever sees their own documents and conversations.

## 🔍 How it works here

Sign-in → upload triggers chunking + embedding → a question triggers embedding + `match_chunks` vector search → matched chunks become Claude's context → the answer and its sources are saved to `messages`. See [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) for the full request-flow diagram and a step-by-step trace through the real code.

## 🗄️ Data model

| Table | Columns |
|---|---|
| `documents` | `id`, `user_id`, `title`, `created_at` |
| `chunks` | `id`, `document_id`, `user_id`, `content`, `embedding vector(1536)`, `created_at` |
| `conversations` | `id`, `user_id`, `title`, `created_at` |
| `messages` | `id`, `conversation_id`, `user_id`, `role`, `content`, `sources jsonb`, `created_at` |

Every table has Row Level Security enabled with a policy of the form:

```sql
create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Every insert sets `user_id` to the authenticated user (verified server-side via `supabase.auth.getUser()`, never trusted from the client). The `match_chunks` Postgres function used for vector search also filters `where c.user_id = auth.uid()` and runs with `security invoker`, so the similarity search itself can never leak another user's chunks. See `supabase/migration.sql` for the full schema, the HNSW vector index, and the RLS policies.

## 🚀 Local setup

1. Clone the repo and `npm install`.
2. Copy `.env.local.example` to `.env.local` and fill in real values.
3. In your Supabase project's SQL Editor, run `supabase/migration.sql` once.
4. In Supabase, enable the **Google** auth provider (Authentication → Providers) and configure the OAuth client.
5. `npm run dev` and open http://localhost:3000.

### ⚙️ Model configuration

| Env var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | — (required) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | — (required) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | — (required) |
| `OPENAI_API_KEY` | Your OpenAI API key | — (required) |
| `ANTHROPIC_MODEL` | Model ID used to answer questions | `claude-sonnet-5` |
| `EMBEDDING_MODEL` | Model ID used to embed text | `text-embedding-3-small` |

## ✅ Running tests

```bash
npm test
```

18 unit tests cover `chunkText` (overlap, edge cases, empty input) and the input-validation helpers used by the API routes. Tests are mocked/pure — no live Supabase/OpenAI/Anthropic calls in CI.

## 📦 Production build

```bash
npm run build
```

## ☁️ Deployment

Deployed to Vercel via its GitHub integration — pushing to `master` triggers an automatic deploy. CI (`.github/workflows/ci.yml`) runs lint, tests, and a production build on every push/PR before merging.

## 📖 How I built this

Built phase-by-phase against a fixed spec (`PROMPT.md`), committing after each phase. See [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md) for the full build narrative and a generalizable checklist for starting a project like this from scratch.

