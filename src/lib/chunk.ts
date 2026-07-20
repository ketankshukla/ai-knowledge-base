export function chunkText(text: string, size = 800, overlap = 150): string[] {
  if (!text) return [];
  if (size <= 0) throw new Error("size must be greater than 0");
  if (overlap < 0 || overlap >= size) {
    throw new Error("overlap must be >= 0 and less than size");
  }

  const chunks: string[] = [];
  const step = size - overlap;

  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));

    if (end === text.length) break;
  }

  return chunks;
}
