export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateDocumentInput(input: {
  title?: unknown;
  text?: unknown;
}): { valid: true } | { valid: false; error: string } {
  if (!isNonEmptyString(input.title)) {
    return { valid: false, error: "Title is required." };
  }
  if (!isNonEmptyString(input.text)) {
    return { valid: false, error: "Document text is required." };
  }
  return { valid: true };
}

export function validateChatInput(input: {
  question?: unknown;
}): { valid: true } | { valid: false; error: string } {
  if (!isNonEmptyString(input.question)) {
    return { valid: false, error: "Question is required." };
  }
  return { valid: true };
}
