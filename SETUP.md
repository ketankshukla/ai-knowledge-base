# SETUP — Project 4: AI Knowledge Base (auth + database + vector search)

Your checklist. This is a **real product** — bigger than Projects 1–3 — so there are a couple of extra one-time steps (a Supabase project and a database migration). Take it slowly; the agent pauses and waits at each one.

The file you hand to Windsurf is `PROMPT_4_ai-knowledge-base.md`.

**What you're building:** a signed-in app where each user uploads documents, chats with them (grounded answers + citations), and their workspace and chat history persist in a real database. No two users can see each other's data.

---

## 1. Before you start (one-time)

**Accounts & keys** (reuse what you have; add Supabase):
- [ ] GitHub, Vercel, Anthropic API key, OpenAI API key — from earlier projects
- [ ] **Supabase project** (free) — see the boxed steps below

**Tools:** node v20+, git, gh, vercel (already set up). Logins valid: `gh auth login`, `vercel login`.

### Create your Supabase project (do this now)
1. Go to supabase.com → sign in with GitHub → **New project**.
2. Give it a name (e.g. `ai-knowledge-base`), set a database password (save it somewhere), pick a region near you, create it. Wait ~2 minutes for it to provision.
3. In the project, go to **Settings → API**. Copy two values — you'll paste them at Action 2:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - the **anon / publishable key** (the public one — safe to expose; it's protected by database security rules). **Do NOT use the service_role key** — this app doesn't need it, and it must never go in a web app.

---

## 2. Start the build
1. Create an empty folder `ai-knowledge-base`.
2. Put `PROMPT_4_ai-knowledge-base.md` in it, renamed to `PROMPT.md`.
3. Open in Windsurf; pick **Claude Sonnet 5 (high)** and allow command execution. This build is hard because of fiddly, well-documented integration (auth cookies, RLS, pgvector SQL), not raw reasoning — and the PROMPT file spells out the exact SQL and patterns — so Sonnet 5 high handles it well at much lower token cost. Keep **Opus 4.8** in reserve only for a stubborn bug (see the tip box below).
4. Type:
   > Read `PROMPT.md` and complete every phase in order. Explain each step in plain language. Stop at every **⏸ PAUSE** and wait for me.

### Model & token tips (keep costs down)
- **Default: Sonnet 5 (high).** It's the right model for this build.
- **Fallback: Opus 4.8, only when stuck.** If Sonnet loops on one of the two tricky spots — RLS blocking inserts (usually `user_id` not set to the signed-in user), or the session not reaching the server client — switch *that one step* to Opus, let it diagnose, then switch back. You don't need Opus for the whole build.
- **Optional saver:** run Phases 1–3 (scaffold, deps, Supabase clients — mostly boilerplate) on a cheaper setting, and reserve Sonnet 5 high for Phases 4–8 where the real logic lives.
- **Commit after every phase** (the prompt tells the agent to). A bad turn then costs one phase, not the whole build — so you're not paying tokens to regenerate work that was already right.
- If a phase goes sideways, paste the error to your assistant chat — a fix from there is often faster and cheaper than another agent round-trip.

---

## 3. When the agent pauses — do the matching Action

### Action 1 — prerequisites/logins + Supabase project ready
Confirm your Supabase project exists and you have the Project URL + anon key. Fix anything the Phase 0 check flags, then continue.

### Action 2 — Add all keys locally
Create `.env.local` in the project folder:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ANTHROPIC_MODEL=claude-sonnet-5
EMBEDDING_MODEL=text-embedding-3-small
```
Save, tell the agent "done, continue." (This file is git-ignored — never commit it. The anon key is designed to be public; the security rules in Action 3 are what protect your data.)

### Action 3 — Run the database migration
The agent will create a file `supabase/migration.sql` (tables, the vector search function, and per-user security rules). You run it:
1. In your Supabase project, open **SQL Editor → New query**.
2. Open the agent's `supabase/migration.sql`, copy everything, paste it in, and click **Run**.
3. Confirm it says success (no errors). Tell the agent "migration done."
> **Optional (makes testing easier):** In Supabase → **Authentication → Providers → Email**, you can turn **off** "Confirm email" so sign-up works instantly without checking your inbox. If you leave it on, you'll need to click a confirmation link when you sign up.

### Action 4 — (only if it asks) GitHub login
If the push fails, run `gh auth login`, then tell the agent to retry.

### Action 5 — Add all env vars to Vercel
Add these in Vercel (via `vercel env add <NAME>` for Production/Preview/Development, or the dashboard → Settings → Environment Variables):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and optionally `ANTHROPIC_MODEL`, `EMBEDDING_MODEL`. Tell the agent "done."

### Action 6 — Point Supabase Auth at your live site
So sign-up/login works in production:
1. Supabase → **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel production URL (the agent will give it to you after deploy).
3. Add that same URL under **Redirect URLs**. Save. Tell the agent "auth URLs set."

---

## 4. You're done when
- The **live Vercel URL** lets you sign up, log in, upload a document, ask a question, and get a grounded answer **with citations** — and your history is still there after you refresh or log back in.
- Signing in as a second account shows a completely separate, empty workspace (proof the per-user security works).
- The repo `ai-knowledge-base` exists with a **green Actions tab**; `.env.local` is not committed.
- There's a `README.md`.

Send me the live URL + repo link for your resume — this is the one that says "I can build a real product."
