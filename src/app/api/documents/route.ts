import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { validateDocumentInput } from "@/lib/validation";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateDocumentInput(body ?? {});

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { title, text } = body as { title: string; text: string };

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({ title, user_id: user.id })
    .select("id")
    .single();

  if (documentError || !document) {
    return NextResponse.json(
      { error: documentError?.message ?? "Failed to create document" },
      { status: 500 }
    );
  }

  const pieces = chunkText(text);

  if (pieces.length === 0) {
    return NextResponse.json({ id: document.id, chunkCount: 0 });
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(pieces);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Embedding failed" },
      { status: 502 }
    );
  }

  const chunkRows = pieces.map((content, i) => ({
    document_id: document.id,
    user_id: user.id,
    content,
    embedding: embeddings[i],
  }));

  const { error: chunksError } = await supabase
    .from("chunks")
    .insert(chunkRows);

  if (chunksError) {
    return NextResponse.json({ error: chunksError.message }, { status: 500 });
  }

  return NextResponse.json({ id: document.id, chunkCount: pieces.length });
}
