/**
 * Utility functions for the Voyagr backend
 */

export function getCurrencySymbol(code) {
  const map = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return map[code] || "$";
}

export function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .trim();
}

/**
 * Attempts to repair truncated JSON by closing any unclosed brackets/braces.
 * This handles the case where Gemini runs out of tokens mid-response.
 */
export function repairTruncatedJSON(json) {
  let inString = false;
  let escaped = false;
  const stack = [];

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
    }
  }

  if (inString) json += '"';

  let trimmed = json;
  if (stack.length > 0) {
    const lastGoodComma = Math.max(
      trimmed.lastIndexOf(","),
      trimmed.lastIndexOf("}"),
      trimmed.lastIndexOf("]")
    );
    if (lastGoodComma > 0 && trimmed[lastGoodComma] === ",") {
      trimmed = trimmed.substring(0, lastGoodComma);
    }
  }

  // Re-calculate stack after trimming
  const finalStack = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") finalStack.push(ch);
    else if (ch === "}" && finalStack.length && finalStack[finalStack.length - 1] === "{") finalStack.pop();
    else if (ch === "]" && finalStack.length && finalStack[finalStack.length - 1] === "[") finalStack.pop();
  }

  let suffix = "";
  while (finalStack.length > 0) {
    const open = finalStack.pop();
    suffix += open === "{" ? "}" : "]";
  }

  return trimmed + suffix;
}
