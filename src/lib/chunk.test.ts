import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns an empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns a single chunk when text is shorter than size", () => {
    const result = chunkText("hello world", 800, 150);
    expect(result).toEqual(["hello world"]);
  });

  it("splits text into overlapping chunks", () => {
    const text = "a".repeat(1000);
    const result = chunkText(text, 400, 100);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(400);
    expect(result[result.length - 1].length).toBeLessThanOrEqual(400);
  });

  it("overlaps consecutive chunks by the given amount", () => {
    const text = "0123456789".repeat(20); // 200 chars
    const size = 50;
    const overlap = 10;
    const result = chunkText(text, size, overlap);

    for (let i = 1; i < result.length; i++) {
      const prevEnd = result[i - 1].slice(-overlap);
      const currentStart = result[i].slice(0, overlap);
      expect(currentStart).toEqual(prevEnd);
    }
  });

  it("covers the full text with no gaps", () => {
    const text = "The quick brown fox jumps over the lazy dog. ".repeat(50);
    const result = chunkText(text, 100, 20);
    const step = 100 - 20;

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i]).toEqual(text.slice(i * step, i * step + 100));
    }
    expect(result[result.length - 1].endsWith(text.slice(-1))).toBe(true);
  });

  it("throws when size is not positive", () => {
    expect(() => chunkText("abc", 0, 0)).toThrow();
    expect(() => chunkText("abc", -5, 0)).toThrow();
  });

  it("throws when overlap is negative or >= size", () => {
    expect(() => chunkText("abc", 10, -1)).toThrow();
    expect(() => chunkText("abc", 10, 10)).toThrow();
    expect(() => chunkText("abc", 10, 11)).toThrow();
  });

  it("uses default size and overlap when not specified", () => {
    const text = "x".repeat(2000);
    const result = chunkText(text);
    expect(result[0]).toHaveLength(800);
  });
});
