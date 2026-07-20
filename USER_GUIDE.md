# 📖 User Guide — AI Knowledge Base

## 🧭 How to use it

1. Open the [live app](https://ai-knowledge-base-red.vercel.app) and click **Sign up** or **Log in** (both go through the same "Continue with Google" flow — you'll only be prompted to pick a Google account if you aren't already signed in).
2. On the `/app` dashboard, paste a title + some text, or upload a `.txt`/`.md` file, and click **Upload**. It appears under "Your documents" once ingestion finishes.
3. In the chat panel, type a question and press **Send**. The assistant answers using only your uploaded documents and lists which chunks it cited under "Sources."
4. Click **+ New chat** to start a fresh conversation, or click any past conversation in the sidebar to reload its full message history.
5. Click **Log out** when you're done — closing the browser tab does *not* log you out, since your session persists until you explicitly sign out.

## 📂 What's in the sample content

There's no seeded sample content — this is a personal knowledge base, so the documents panel is empty until you upload something. Any plain text works: notes, articles, policy documents, etc.

## ✅ Example questions that work

- Direct factual questions about something stated in your uploaded document (e.g. "What does this document say about X?").
- Summarization requests scoped to your content (e.g. "Summarize the key points of this document.").
- Follow-up questions within the same conversation — history persists, so you can build on earlier answers.

## ⚠️ Example inputs that should NOT work / out-of-scope

- Questions about topics not covered in any of your uploaded documents — the assistant is instructed to say it doesn't know rather than make something up.
- Requests to retrieve exact line-by-line formatting (e.g. "give me exactly line 3") — documents are split into overlapping ~800-character chunks for retrieval, so exact line boundaries aren't preserved. The assistant will tell you when it can't be certain about literal positional structure.
- Uploading empty text or an empty title — the upload form and the `/api/documents` endpoint both reject empty input.

## 💡 Tips for best results

- Keep questions specific and grounded in what you actually uploaded — vague or off-topic questions are more likely to get an "I don't know."
- Upload documents in reasonably plain text; very short documents (a sentence or two) don't leave much for the retrieval step to work with.
- If an answer seems incomplete, ask a follow-up in the same conversation — the assistant retrieves fresh context for every question.

## 🛠️ Troubleshooting

- **"Sign-in failed. Please try again."** on `/login` — this can happen on a cold start if the OAuth callback takes too long to process a single-use authorization code. Just click "Continue with Google" again.
- **Chat says "I don't know" for something you know is in the document** — try rephrasing the question to more closely match wording in the document, or ask a more specific question; retrieval is similarity-based, not keyword search.
- **Document doesn't appear after upload** — check for an error message under the upload form; empty title/text is rejected client- and server-side.
- **Second account sees the first account's data** — this should never happen (Row Level Security enforces per-user isolation). If you see this, it's a bug — please report it.
