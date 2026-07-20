"use client";

import { useState } from "react";

type Source = {
  index: number;
  documentId: string;
  title: string;
  content: string;
  similarity: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
};

export function ChatPanel({
  initialConversations,
}: {
  initialConversations: ConversationSummary[];
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialConversations
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNewChat() {
    setConversationId(undefined);
    setMessages([]);
    setError(null);
  }

  async function handleSelectConversation(id: string) {
    if (id === conversationId) return;

    setError(null);
    setLoadingConversation(true);
    setConversationId(id);

    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to load conversation.");
        setMessages([]);
        return;
      }

      setMessages(
        (json.messages ?? []).map(
          (m: { role: "user" | "assistant"; content: string; sources: Source[] | null }) => ({
            role: m.role,
            content: m.content,
            sources: m.sources ?? undefined,
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoadingConversation(false);
    }
  }

  async function refreshConversations() {
    const res = await fetch("/api/conversations");
    const json = await res.json();
    if (res.ok) {
      setConversations(json.conversations ?? []);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setMessages((prev) => [...prev, { role: "user", content: currentQuestion }]);
    setQuestion("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, conversationId }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      const isNewConversation = !conversationId;
      setConversationId(json.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: json.answer, sources: json.sources },
      ]);

      if (isNewConversation) {
        await refreshConversations();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[32rem] gap-4">
      <div className="flex w-56 flex-col rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          onClick={handleNewChat}
          className="mb-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          + New chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No conversations yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleSelectConversation(c.id)}
                    className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${
                      c.id === conversationId
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex-1 overflow-y-auto p-4">
          {loadingConversation ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ask a question about your uploaded documents.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase text-zinc-400">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                    {message.content}
                  </p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Sources
                      </span>
                      {message.sources.map((s) => (
                        <p
                          key={s.index}
                          className="text-xs text-zinc-600 dark:text-zinc-400"
                        >
                          [{s.index}] {s.title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="px-4 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your documents..."
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
