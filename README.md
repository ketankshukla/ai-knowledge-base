# AI Knowledge Base

A signed-in knowledge base: upload or paste documents, chat with them, and get answers grounded in your own content with citations. Conversations and documents persist per user, isolated by Postgres Row Level Security.

**Live URL:** https://ai-knowledge-base-red.vercel.app

## What it does

- Sign in with Google.
- Upload a `.txt`/`.md` file or paste text as a document.
- The app chunks the document, embeds each chunk with OpenAI, and stores the vectors in Postgres (pgvector).
- Ask a question in the chat panel — the app embeds the question, finds the most similar chunks via cosine-similarity search, and asks Claude to answer **only** from that context, citing which chunks it used.
- Conversations and messages persist and are listed in a sidebar; switching between them reloads the full message history.
- Row Level Security guarantees every user only ever sees their own documents and conversations.

## Architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS** — UI and API routes.
- **Supabase** — Auth (Google OAuth), Postgres, and `pgvector` for embeddings, accessed via `@supabase/supabase-js` and `@supabase/ssr`.
- **OpenAI (`text-embedding-3-small`)** — embeddings for document chunks and chat questions.
- **Anthropic Claude (`claude-sonnet-5`)** — generates grounded answers from retrieved context.
- **Vitest** — unit tests for chunking and input validation.
- **Vercel** — hosting, deployed via GitHub integration (push to `master` auto-deploys).

### How Row Level Security isolates users

Every table (`documents`, `chunks`, `conversations`, `messages`) has RLS enabled with a policy of the form:

```sql
create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Every insert sets `user_id` to the authenticated user (verified server-side via `supabase.auth.getUser()`, never trusted from the client). The `match_chunks` Postgres function used for vector search also filters `where c.user_id = auth.uid()` and runs with `security invoker`, so even the similarity search can never leak another user's chunks.

### Data model

| Table | Columns |
|---|---|
| `documents` | `id`, `user_id`, `title`, `created_at` |
| `chunks` | `id`, `document_id`, `user_id`, `content`, `embedding vector(1536)`, `created_at` |
| `conversations` | `id`, `user_id`, `title`, `created_at` |
| `messages` | `id`, `conversation_id`, `user_id`, `role`, `content`, `sources jsonb`, `created_at` |

See `supabase/migration.sql` for the full schema, HNSW vector index, RLS policies, and the `match_chunks` function.

## Running locally

1. Clone the repo and `npm install`.
2. Copy `.env.local.example` to `.env.local` and fill in real values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ANTHROPIC_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_MODEL=claude-sonnet-5
   EMBEDDING_MODEL=text-embedding-3-small
   ```
3. In your Supabase project's SQL Editor, run `supabase/migration.sql` once.
4. In Supabase, enable the **Google** auth provider (Authentication → Providers) and configure the OAuth client.
5. `npm run dev` and open http://localhost:3000.

## Tests

```bash
npm test
```

18 unit tests cover `chunkText` (overlap, edge cases, empty input) and the input-validation helpers used by the API routes. Tests are mocked/pure — no live Supabase/OpenAI/Anthropic calls in CI.

## Production build

```bash
npm run build
```

## Deployment

Deployed to Vercel via its GitHub integration — pushing to `master` triggers an automatic deploy. CI (`.github/workflows/ci.yml`) runs lint, tests, and a production build on every push/PR before merging.

## How I built this

Built phase-by-phase against a fixed spec (`PROMPT.md`), committing after each phase: scaffold → Supabase clients + session middleware → database schema/RLS/vector search function → Google OAuth + route protection → chunking utility → document ingest with embeddings → RAG chat endpoint with citations → chat UI → conversation history → unit tests → GitHub + CI → Vercel deploy. Each phase was type-checked, linted, and manually verified in the browser before moving to the next.

