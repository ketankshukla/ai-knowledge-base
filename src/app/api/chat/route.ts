import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { embedTexts } from "@/lib/embeddings";
import { validateChatInput } from "@/lib/validation";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

type MatchedChunk = {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateChatInput(body ?? {});

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { question, conversationId } = body as {
    question: string;
    conversationId?: string;
  };

  let currentConversationId = conversationId;

  if (!currentConversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: question.slice(0, 60) })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: conversationError?.message ?? "Failed to create conversation" },
        { status: 500 }
      );
    }

    currentConversationId = conversation.id;
  }

  const { error: userMessageError } = await supabase.from("messages").insert({
    conversation_id: currentConversationId,
    user_id: user.id,
    role: "user",
    content: question,
  });

  if (userMessageError) {
    return NextResponse.json({ error: userMessageError.message }, { status: 500 });
  }

  let questionEmbedding: number[];
  try {
    [questionEmbedding] = await embedTexts([question]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Embedding failed" },
      { status: 502 }
    );
  }

  const { data: matches, error: matchError } = await supabase.rpc(
    "match_chunks",
    {
      query_embedding: questionEmbedding,
      match_threshold: 0.3,
      match_count: 5,
    }
  );

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  const chunks = (matches ?? []) as MatchedChunk[];
  const documentIds = Array.from(new Set(chunks.map((c) => c.document_id)));
  let titleByDocumentId = new Map<string, string>();

  if (documentIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title")
      .in("id", documentIds);

    titleByDocumentId = new Map(
      (docs ?? []).map((d: { id: string; title: string }) => [d.id, d.title])
    );
  }

  const sources = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.document_id,
    title: titleByDocumentId.get(chunk.document_id) ?? "Untitled",
    content: chunk.content,
    similarity: chunk.similarity,
  }));

  const context = sources
    .map((s) => `[${s.index}] (${s.title})\n${s.content}`)
    .join("\n\n");

  const systemPrompt =
    "Answer ONLY using the provided context. If it isn't there, say you don't know. Cite the source chunks using their [number].";

  const userPrompt = context
    ? `Context:\n${context}\n\nQuestion: ${question}`
    : `Context: (no relevant documents found)\n\nQuestion: ${question}`;

  let answer: string;
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    answer = textBlock && "text" in textBlock ? textBlock.text : "";
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat completion failed" },
      { status: 502 }
    );
  }

  const { error: assistantMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: currentConversationId,
      user_id: user.id,
      role: "assistant",
      content: answer,
      sources,
    });

  if (assistantMessageError) {
    return NextResponse.json(
      { error: assistantMessageError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    conversationId: currentConversationId,
    answer,
    sources,
  });
}
