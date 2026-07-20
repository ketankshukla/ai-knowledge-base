# BUILD PROMPT — Project 4: AI Knowledge Base (auth + database + vector search)

You are a senior full-stack engineer pair-building with a developer new to agentic workflows. Build the project below end to end, from an empty folder to a live Vercel URL. This is a real product with authentication, a database, and per-user security — more complex than a demo, so be careful and methodical. The developer has a separate setup checklist; pause at the marked points and ask them to complete the numbered Setup Action.

## RULES (follow for the whole build)
- You will likely be run on **Claude Sonnet 5**. Work efficiently and precisely: follow the phase order and the exact patterns/SQL given below rather than re-deriving them, so you don't waste turns. The two spots that most often need care are Row Level Security (every insert must set `user_id` to the authenticated user) and getting the session to the server client — slow down and get these right the first time.
- One phase at a time, in order. After each: run it, confirm it works, git commit. Explain each step in plain language first. (Committing per phase means a wrong turn costs one phase, not the whole build.)
- **Security is critical here.** Never print or commit secrets. The Supabase **anon key** is safe in `NEXT_PUBLIC_` vars (it's protected by Row Level Security). **Never** use or request a Supabase service_role key in this app. All per-user data isolation depends on RLS being enabled with correct policies — do not skip it.
- Read all config from environment variables.
- Small, reviewable diffs. Announce destructive actions.
- On failure: stop, show the error, explain, propose a fix. No silent retries.
- At every **⏸ PAUSE**, stop, name the Setup Action, and wait. Never enter secrets, run migrations in the dashboard, or log in for the developer — those are their actions.

## DEFINITION OF DONE
`npm run dev` works · `npm test` passes · `npm run build` succeeds · pushed to public repo `ai-knowledge-base` · CI green · deployed to Vercel where a user can sign up, upload a document, get grounded answers with citations, and see persistent history · a second account sees a separate empty workspace (RLS verified) · complete README.

## PROJECT OVERVIEW
A signed-in knowledge base. Each user: signs up / logs in; uploads or pastes documents; the app chunks and embeds them into a vector database; the user chats with their documents and gets answers grounded in their own content, with citations; conversations and documents persist per user. Row Level Security guarantees users only ever access their own rows.

## TECH STACK (use exactly this)
- Next.js (latest, App Router) + TypeScript + Tailwind CSS
- **Supabase** — Auth + Postgres + **pgvector** — via `@supabase/supabase-js` and `@supabase/ssr`
- Anthropic SDK (`@anthropic-ai/sdk`) for answers; OpenAI SDK (`openai`) for embeddings
- `tsx` (scripts), Vitest (tests), Vercel, GitHub Actions

### Model configuration (exact values)
- Answering: `process.env.ANTHROPIC_MODEL` default **`claude-sonnet-5`**.
- Embeddings: `process.env.EMBEDDING_MODEL` default **`text-embedding-3-small`** (vector dimension **1536**).

### Supabase in the App Router (use this pattern — it is the current one)
- Install `@supabase/supabase-js @supabase/ssr`.
- Browser client with `createBrowserClient` (for Client Components).
- Server client with `createServerClient` (for Server Components, Route Handlers, Server Actions) that reads/writes cookies.
- A `middleware.ts` that refreshes the session on each request.
- In server code, verify the user with `supabase.auth.getUser()` (never trust an unverified session).
- If any API surface differs from what's installed, follow the current Supabase docs at supabase.com/docs/guides/auth/server-side/nextjs and adapt.

---

## PHASE 0 — Prerequisite check
Report node (v20+), npm, git, gh, vercel; check `gh auth status`, `vercel whoami`. Ask the developer to confirm they have a Supabase project with a Project URL and anon key. Anything missing → **⏸ PAUSE (Setup Action 1)**.

## PHASE 1 — Scaffold
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-npm --no-import-alias
```
Confirm dev server, stop it. **Commit:** `chore: scaffold Next.js app`.

## PHASE 2 — Dependencies and environment
- `npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk openai` and `npm install -D vitest tsx @vitejs/plugin-react`.
- Create `.env.local.example`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  ANTHROPIC_API_KEY=your_key_here
  OPENAI_API_KEY=your_key_here
  ANTHROPIC_MODEL=claude-sonnet-5
  EMBEDDING_MODEL=text-embedding-3-small
  ```
- Ensure `.gitignore` ignores `.env*` and `.vercel`.
- **⏸ PAUSE (Setup Action 2):** developer creates `.env.local` with real values. Wait.
- **Commit:** `chore: deps and env template`.

## PHASE 3 — Supabase clients + middleware
Create:
- `src/lib/supabase/client.ts` — `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
- `src/lib/supabase/server.ts` — an async `createClient()` using `createServerClient` wired to Next's `cookies()` (getAll/setAll).
- `src/middleware.ts` + a helper that calls `createServerClient` and `supabase.auth.getUser()` to refresh the session and sync cookies; add a `matcher` excluding static assets.
- **Commit:** `feat: supabase browser/server clients + session middleware`.

## PHASE 4 — Database migration file
Create `supabase/migration.sql` with EXACTLY this intent (tables, HNSW index, RLS, and a user-scoped match function):
```sql
create extension if not exists vector;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);
create index if not exists chunks_embedding_idx on public.chunks using hnsw (embedding vector_cosine_ops);
create index if not exists chunks_user_idx on public.chunks(user_id);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "own documents" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own chunks" on public.chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own conversations" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (id uuid, document_id uuid, content text, similarity float)
language sql stable
security invoker
set search_path = public
as $$
  select c.id, c.document_id, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  where c.user_id = auth.uid()
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```
- **⏸ PAUSE (Setup Action 3):** developer pastes this into the Supabase SQL Editor and runs it. Wait for "migration done."
- **Commit:** `feat: database schema, RLS, and match_chunks function`.

## PHASE 5 — Auth (sign up / log in / log out) + route protection
- Build `/login` and `/signup` pages (Client Components) using the browser client's `signUp` / `signInWithPassword`, and a sign-out action.
- In middleware (or a layout), redirect unauthenticated users away from the protected app (e.g. `/app`) to `/login`, using `getUser()`.
- Add a simple protected `/app` dashboard shell that greets the logged-in user and has a sign-out button.
- Test: sign up, log in, get to `/app`, log out. (If email confirmation is on, the developer confirms via email — note this.)
- **Commit:** `feat: auth pages + protected dashboard`.

## PHASE 6 — Retrieval utilities (pure, testable)
Create `src/lib/chunk.ts`: `chunkText(text, size=800, overlap=150): string[]` (overlapping chunks; covers the whole input). Keep network/db out of it.
- **Commit:** `feat: text chunking utility`.

## PHASE 7 — Document ingest (server, as the authenticated user)
- A Route Handler `POST /api/documents` that: verifies the user (`getUser()`), accepts `{ title, text }`, inserts a `documents` row, chunks the text, embeds each chunk with OpenAI (`text-embedding-3-small`), and inserts `chunks` rows (with `user_id` = the user's id) via the **server client** (RLS enforces ownership).
- A UI on `/app` to paste a title + text (or upload a `.txt`/`.md` file) and submit; list the user's documents.
- **Commit:** `feat: document upload + embedding ingest`.

## PHASE 8 — Chat with retrieval + persistence
- A Route Handler `POST /api/chat` that: verifies the user; embeds the question (OpenAI); calls `supabase.rpc('match_chunks', { query_embedding, match_threshold: 0.3, match_count: 5 })`; builds context from the returned chunks; calls Claude with a system prompt: "Answer ONLY using the provided context. If it isn't there, say you don't know. Cite the source chunks." Then saves both the user message and the assistant message (with `sources`) to the `messages` table under a conversation.
  ```ts
  import Anthropic from "@anthropic-ai/sdk";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  ```
- **Commit:** `feat: grounded chat over user documents with saved history`.

## PHASE 9 — History UI
- On `/app`, show the conversation/message history from the database (loads on refresh), with the answer and its cited sources. Keep the UI clean and simple with Tailwind.
- **Commit:** `feat: persistent chat history UI`.

## PHASE 10 — Tests
- `vitest.config.ts` + `"test": "vitest run"`.
- `src/lib/chunk.test.ts`: `chunkText` respects size/overlap and covers the whole input; empty input returns an empty array.
- Add at least one test for an API input-validation helper (e.g., rejects empty question/title). Mock external calls; do not hit Supabase/OpenAI/Anthropic in CI.
- `npm test` green. **Commit:** `test: chunking + input validation`.

## PHASE 11 — Local verification
`npm run dev`: sign up → upload a document → ask a question answerable from it → grounded answer with citations → refresh and confirm history persists → ask something not in the docs → "don't know". Sign up a second account and confirm its workspace is empty (RLS works). `npm run build` succeeds.

## PHASE 12 — GitHub repo + push
```bash
gh repo create ai-knowledge-base --public --source=. --remote=origin --push
```
Not authenticated → **⏸ PAUSE (Setup Action 4)**. Confirm repo; `.env.local` not committed; `supabase/migration.sql` IS committed.

## PHASE 13 — CI
`.github/workflows/ci.yml`: Node 20, `npm ci`, `npm run lint`, `npm test`, `npm run build` on push/PR. CI must not require live secrets (tests are mocked). Confirm green. **Commit:** `ci: workflow`.

## PHASE 14 — Deploy to Vercel
```bash
vercel link
vercel
```
- **⏸ PAUSE (Setup Action 5):** developer adds all env vars to Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and optionally the model vars). Wait.
```bash
vercel --prod
```
- Give the developer the live production URL, then **⏸ PAUSE (Setup Action 6):** they set Supabase Auth **Site URL** and **Redirect URLs** to that production URL. Wait.
- Open the live URL and run the full flow in production: sign up, upload, ask, confirm citations + persistence.

## PHASE 15 — README and finish
`README.md`: what it does, live URL, architecture (Next.js + Supabase Auth/Postgres/pgvector + Claude + OpenAI), how RLS isolates users, the data model, how to run locally (env + migration), tests, and a "How I built this" note. Add MIT `LICENSE`. Commit, push, report the Definition-of-done checklist.

---

## TROUBLESHOOTING
- **Rows not saving / empty results:** RLS is blocking because `user_id` wasn't set to the authenticated user, or the session isn't reaching the server client. Verify `getUser()` returns a user and every insert sets `user_id`.
- **`match_chunks` errors:** confirm the migration ran (pgvector enabled, function exists) and the embedding dimension is 1536.
- **Auth works locally but not in production:** Supabase Site URL / Redirect URLs must include the Vercel domain (Setup Action 6).
- **Invalid model:** use a current ID (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`).
- **Never** add a service_role key to fix an RLS problem — fix the policy or the `user_id` instead.
