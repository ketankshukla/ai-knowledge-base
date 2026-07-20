# 🧠 Thought Process

> **Rendering note:** this document relies only on what GitHub renders natively (headings, emoji, blockquotes, tables, horizontal rules) — no custom CSS or forced colors.

## 🗺️ Part 1 — how the build unfolded

Built against a fixed spec (`PROMPT.md`), one phase at a time, committing after each phase so a wrong turn costs one phase, not the whole build. The real commit history:

```
91e8c0c Initial commit from Create Next App
fa3434b chore: scaffold Next.js app
2b41425 chore: deps and env template
ab67d29 feat: supabase browser/server clients + session middleware
52b43ca feat: database schema, RLS, and match_chunks function
0786a71 feat: auth pages + protected dashboard
5d9170d feat: text chunking utility
999a6f4 feat: document upload + embedding ingest
1c9d54d chore: ignore eslint cache
f05ba71 feat: RAG chat endpoint with citations and persistence
f5cf9f0 feat: chat UI with sources
2f0eb8c test: unit tests for chunking and validation
b19509b feat: conversation history sidebar and persistence
4b7860d fix: show error message on failed OAuth callback
ca7cd84 ci: workflow
f4dbadd fix: redirect authenticated users from homepage to /app
3e2796e docs: README and MIT license
```

A few real snags, each grounded in the actual diff or the same build session:

1️⃣ **A React lint rule caught a real anti-pattern before it shipped.** The first draft of `documents-panel.tsx` fetched the document list inside a `useEffect` by calling an async helper that set `loading` state as its first statement — meaning `setState` ran *synchronously* the moment the effect fired. `eslint-plugin-react-hooks`' `set-state-in-effect` rule flagged this directly.
   > 🛠️ **Fix:** moved the initial fetch to the server. `src/app/app/page.tsx` now fetches `documents` in the Server Component and passes them as `initialDocuments` — the idiomatic App Router pattern — instead of an effect-driven client fetch on mount. This is why `documents-panel.tsx` and `chat-panel.tsx` both take server-fetched initial data as props rather than fetching on mount.

2️⃣ **The retrieval threshold was too strict for a single-document workspace.** `POST /api/chat` originally called `match_chunks` with `match_threshold: 0.3`. With only one uploaded document, a real test question returned *zero* matches and Claude correctly (but uselessly) said "I don't know" — the cosine-similarity cutoff was pre-filtering away the only relevant content before the model ever saw it.
   > 🛠️ **Fix:** changed `match_threshold` to `-1` (verified via `git log -S"match_threshold: -1"`, folded into commit `f5cf9f0`) so the top-N nearest chunks are always returned regardless of absolute similarity, and the system prompt — not a numeric cutoff — decides whether the context actually answers the question.

3️⃣ **A committed build artifact.** `.eslintcache` was accidentally included in the "RAG chat endpoint" commit. Fixed immediately in `1c9d54d chore: ignore eslint cache` by removing it from the index and adding it to `.gitignore`.

4️⃣ **A silent OAuth failure.** During manual testing, a first Google sign-in attempt occasionally landed back on `/login` with no visible feedback (most likely a single-use authorization code expiring during a slow first-time Turbopack route compile in dev — production has no per-route JIT compile, so this is not expected to reproduce on Vercel). Regardless of root cause, failing silently was a real UX bug.
   > 🛠️ **Fix:** `4b7860d fix: show error message on failed OAuth callback` — `/login` now reads an `?error=` query param and renders a visible message instead of failing silently.

5️⃣ **Homepage didn't respect an existing session.** The proxy/middleware only redirected already-authenticated users away from `/login` and `/signup`, not from `/`, so a signed-in user landed on the marketing page instead of the app.
   > 🛠️ **Fix:** `f4dbadd fix: redirect authenticated users from homepage to /app` added a third `isHomeRoute` check to the same redirect logic in `src/lib/supabase/proxy.ts`.

## 🎯 Part 2 — generalizable checklist

A checklist for starting a similar auth + database + AI project from scratch:

1️⃣ **Decide the RLS policy shape before writing any insert.** Every table gets `user_id`, RLS enabled, and a `using (auth.uid() = user_id) with check (...)` policy — decide this in the migration phase, not retroactively, since every subsequent insert/select depends on it.

2️⃣ **Verify the session server-side on every route, not just in middleware.** Middleware refreshing cookies is necessary but not sufficient — each Route Handler should independently call `getUser()` before touching the database.

3️⃣ **Prefer server-fetched initial data over `useEffect` + client fetch for anything available at request time.** It avoids an entire class of "setState in effect" lint issues and is one fewer round trip.

4️⃣ **Don't pre-filter retrieval with an arbitrary similarity threshold.** Return the top-N nearest neighbors and let the model's system prompt decide relevance — a hard numeric cutoff tuned on no real data is a common way to silently break retrieval.

5️⃣ **Commit after every phase, and run lint/typecheck/tests before each commit.** This build's `.gitignore` mistake and the effect-lint catch were both caught *before* they compounded, specifically because of this discipline.

6️⃣ **Read the installed framework's actual docs, not training-data assumptions, for anything version-sensitive.** This project's `AGENTS.md` exists precisely because Next.js's own conventions (route handler `params` as a `Promise`, Turbopack dev behavior) can differ from what a model "remembers."

7️⃣ **Never use a service-role key to route around an RLS problem.** If an insert is blocked, the fix is almost always a missing `user_id` on the insert or a missing `getUser()` call upstream — not a broader key.
