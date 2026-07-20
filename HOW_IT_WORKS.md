# 🔬 How This App Works

> **Rendering note:** this document relies only on what GitHub renders natively (headings, emoji, blockquotes, tables, horizontal rules) — no custom CSS or forced colors.

🤖 See also: [`USER_GUIDE.md`](./USER_GUIDE.md) for how to use the app, and [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md) for the reasoning behind these choices.

## 🧠 The short answer (explained like you're 5)

You upload a document. The app cuts it into small overlapping pieces and turns each piece into a list of numbers (an "embedding") that captures its meaning. When you ask a question, the app turns your question into numbers too, then finds the pieces whose numbers are closest to your question's numbers. It hands only those pieces to Claude and says "answer using ONLY this." That's the whole trick — it's search, not memory.

## 🔐 Auth

Sign-in is Google OAuth via Supabase, using the PKCE flow:

1. `src/app/google-auth-button.tsx:15-21` calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "<origin>/auth/callback" } })` from the browser client.
2. The browser is redirected to Google, then back to `src/app/auth/callback/route.ts`, which receives a one-time `code` and calls `supabase.auth.exchangeCodeForSession(code)` (`src/app/auth/callback/route.ts:9-14`) using the **server** client, which persists the session into cookies.
3. On success it redirects to `/app`; on failure it redirects to `/login?error=auth_failed`, which `src/app/login/page.tsx:4-9` reads and displays as an error message.
4. `src/proxy.ts` + `src/lib/supabase/proxy.ts` run on every request. `updateSession()` calls `supabase.auth.getUser()` (`src/lib/supabase/proxy.ts:30`) to refresh the session, then redirects unauthenticated users away from `/app` to `/login`, and redirects already-authenticated users away from `/login`, `/signup`, and `/` straight to `/app` (`src/lib/supabase/proxy.ts:32-48`).
5. Every server-side route handler independently calls `supabase.auth.getUser()` again (never trusting the middleware alone) before touching the database — e.g. `src/app/api/documents/route.ts:9`.

## 🗄️ Data model

See `supabase/migration.sql` for the exact SQL. Four tables, all with Row Level Security and a policy shaped like `using (auth.uid() = user_id) with check (auth.uid() = user_id)`:

| Table | Purpose |
|---|---|
| `documents` | One row per uploaded document (`title`, `user_id`). |
| `chunks` | One row per ~800-character overlapping slice of a document, plus its `vector(1536)` embedding. Indexed with an HNSW index for fast cosine-similarity search. |
| `conversations` | One row per chat thread (`title` derived from the first question). |
| `messages` | One row per user/assistant turn, with `sources jsonb` on assistant rows recording which chunks were cited. |

The `match_chunks` Postgres function (defined in the migration) does the vector search itself, filtered to `where c.user_id = auth.uid()` and run with `security invoker` — so even this function can never return another user's chunks, independent of any application-level filtering.

## 🔁 Full request flow, end to end

**Upload:** browser → `POST /api/documents` → verify user → insert `documents` row → `chunkText()` → `embedTexts()` (OpenAI) → insert `chunks` rows with embeddings.

**Chat:** browser → `POST /api/chat` → verify user → create/reuse `conversations` row → insert user `messages` row → `embedTexts([question])` → `supabase.rpc("match_chunks", ...)` → look up document titles for the matches → build a numbered context string → `anthropic.messages.create()` with a strict "answer only from context" system prompt → insert assistant `messages` row with `sources` → return `{ answer, sources }` to the browser.

## 🪜 Step by step (document upload)

1. `src/app/app/documents-panel.tsx` collects a title + text (or reads a `.txt`/`.md` file into text) and `POST`s JSON to `/api/documents`.
2. `src/app/api/documents/route.ts:28-33` verifies the session via `getUser()`.
3. `validateDocumentInput()` (`src/lib/validation.ts`) rejects empty title/text before anything touches the database.
4. `src/app/api/documents/route.ts:44-48` inserts the `documents` row with `user_id: user.id` — this is the field RLS checks on every subsequent read/write.
5. `chunkText(text)` (`src/lib/chunk.ts`) splits the text into overlapping ~800-character pieces (150-character overlap, so no sentence spanning a chunk boundary is fully lost).
6. `embedTexts(pieces)` (`src/lib/embeddings.ts:6-15`) sends all pieces to OpenAI's `text-embedding-3-small` in a single batched call and returns one 1536-dimension vector per piece.
7. `src/app/api/documents/route.ts:73-82` inserts one `chunks` row per piece, embedding included, all tagged with the same `user_id`.

## 🪜 Step by step (chat)

1. `src/app/app/chat-panel.tsx` sends `{ question, conversationId }` to `/api/chat`.
2. `src/app/api/chat/route.ts` verifies the user, creates a new `conversations` row if `conversationId` is absent (title = the question, truncated), and inserts the user's message.
3. The question itself is embedded the same way a document chunk would be (`embedTexts([question])`).
4. `supabase.rpc("match_chunks", { query_embedding, match_threshold: -1, match_count: 5 })` returns the 5 nearest chunks by cosine similarity, regardless of absolute similarity score — the threshold is intentionally permissive so Claude (not a hard numeric cutoff) decides whether the retrieved content is actually relevant.
5. Document titles for the matched `document_id`s are looked up so citations can show a human-readable source name, not just a UUID.
6. The matched chunks are numbered (`[1]`, `[2]`, ...) and joined into a single context string, with a system prompt instructing Claude to answer only from that context and cite chunk numbers.
7. Claude's text response is saved as an assistant `messages` row alongside the `sources` array (as `jsonb`), and both the answer and its sources are returned to the browser, which renders them under the message.

## 💾 Where does the data go?

Everything lives in Supabase Postgres. Embeddings are `vector(1536)` columns (pgvector extension) with an HNSW index for approximate nearest-neighbor search. Nothing is cached or duplicated client-side beyond the current React state — refreshing the page re-fetches documents and conversations server-side (`src/app/app/page.tsx`), and clicking a past conversation re-fetches its messages via `GET /api/conversations/[id]`.

## 🏁 Key takeaway

The entire "intelligence" of this app is retrieval, not the model having memorized your documents. Correctness depends on three things staying true: chunking that doesn't lose meaning at boundaries, embeddings that place semantically similar text close together, and a system prompt that refuses to answer beyond what was retrieved. Security depends on one thing staying true: every row is tagged with `user_id` and RLS enforces it everywhere, including inside the vector-search function itself.
