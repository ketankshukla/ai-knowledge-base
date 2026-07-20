import { describe, expect, it } from "vitest";
import {
  isNonEmptyString,
  validateChatInput,
  validateDocumentInput,
} from "./validation";

describe("isNonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
  });

  it("returns false for empty or whitespace-only strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
  });
});

describe("validateDocumentInput", () => {
  it("passes with a valid title and text", () => {
    expect(validateDocumentInput({ title: "My doc", text: "content" })).toEqual({
      valid: true,
    });
  });

  it("fails when title is missing", () => {
    const result = validateDocumentInput({ text: "content" });
    expect(result.valid).toBe(false);
  });

  it("fails when text is missing", () => {
    const result = validateDocumentInput({ title: "My doc" });
    expect(result.valid).toBe(false);
  });

  it("fails when title is whitespace only", () => {
    const result = validateDocumentInput({ title: "   ", text: "content" });
    expect(result.valid).toBe(false);
  });
});

describe("validateChatInput", () => {
  it("passes with a valid question", () => {
    expect(validateChatInput({ question: "What is this?" })).toEqual({
      valid: true,
    });
  });

  it("fails when question is missing", () => {
    const result = validateChatInput({});
    expect(result.valid).toBe(false);
  });

  it("fails when question is empty", () => {
    const result = validateChatInput({ question: "" });
    expect(result.valid).toBe(false);
  });
});
