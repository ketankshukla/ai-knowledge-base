"use client";

import { useState } from "react";

export type DocumentSummary = {
  id: string;
  title: string;
  created_at: string;
};

export function DocumentsPanel({
  initialDocuments,
}: {
  initialDocuments: DocumentSummary[];
}) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    const json = await res.json();
    if (res.ok) {
      setDocuments(json.documents ?? []);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      if (!title) {
        setTitle(file.name.replace(/\.(txt|md)$/i, ""));
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to upload document.");
        return;
      }

      setTitle("");
      setText("");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Upload a document
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <textarea
            placeholder="Paste document text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={8}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <input
            type="file"
            accept=".txt,.md"
            onChange={handleFile}
            className="text-sm text-zinc-600 dark:text-zinc-400"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Your documents
        </h2>
        {documents.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No documents yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                {doc.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
