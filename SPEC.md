# SPEC - ai-knowledge-base

> What this repo is for, what it deliberately does not do, and what must stay
> true for a change to be correct.

**Live:** https://ai-knowledge-base-red.vercel.app

## 1. Purpose

A signed-in knowledge base: upload or paste documents, then chat with them and
get answers grounded in your own content, with citations.

The requirement that outranks everything else: **my documents must not appear in
your answers.** In a retrieval application that leak is not a row in a list - it
is someone else's document quoted as a source, confidently, with a citation.

## 2. Scope

**In scope** - Supabase auth including Google OAuth via PKCE; per-user documents,
chunks, conversations and messages; pgvector with an HNSW index; retrieval with
citations; persistent conversation history.

**Explicitly out of scope**

- **Tenancy enforced by convention.** Every query filtering on `user_id` is a
  habit, not a boundary. See invariants.
- **Sharing between users.** No teams, no shared corpora - each would need a
  policy model this deliberately does not have.
- **Answering beyond the retrieved context.**

## 4. Architecture

```
upload --> chunk --> embed --> chunks (pgvector, HNSW)
                                  |
question --> embed --> match_chunks(security invoker) --> context --> model --> answer + citations
```

Four tables, all carrying `user_id`: `documents`, `chunks`, `conversations`,
`messages`.

## 5. Invariants

1. **Row-level security is enabled on every table**, with both a `using` clause
   and a `with check` clause. Read isolation without write isolation is half a
   boundary - a user could read only their own rows while inserting rows stamped
   with someone else's id.
2. **`match_chunks` is declared `security invoker`, with `set search_path`.**
   `security definer` runs as the owner and **bypasses row policies entirely** -
   and this one function builds the context for every answer. The failure does
   not throw or log; it returns *more* results, which in a retrieval system looks
   like the search working well.
3. **Every table carries its own `user_id`**, even `chunks`, which could reach it
   through `document_id`. A policy that joins to establish ownership can be
   defeated by a query that joins differently.
4. **Routes call `getUser()`, never `getSession()`.** The first verifies the
   token with the auth server; the second reads a cookie the client controls.
5. **Session refresh runs in the proxy before anything reads cookies.**
6. **The prompt constrains the model to the retrieved context** and permits
   "I don't know" as an answer.

## 6. Verification

**Tenant isolation is proved from a second account, not by re-reading the
policies.** Sign in as an unrelated user, ask a question whose answer exists only
in the first account's documents; the correct outcome is an explicit refusal with
no sources cited. Then check the first account's citations still point only at
its own files.

That is the only test exercising auth, policy, function security mode and the
retrieval query against the actual claim made to users.

## 7. Known limitations

- **`match_chunks` takes a `match_threshold`.** A fixed similarity floor has the
  known failure mode of discarding relevant material silently; it is retained
  here for pgvector query planning and is worth revisiting.
- **No sharing model**, so the product cannot support teams without new policies.
- **Embedding cost scales with upload volume** and is not rate limited per user.

## 8. Related

- Post: [Row-level security is a schema decision, not a code-review convention](https://ketanshukla.dev/blog/row-level-security-is-a-schema-decision)
