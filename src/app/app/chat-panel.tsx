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

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      setConversationId(json.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: json.answer, sources: json.sources },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
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
  );
}
