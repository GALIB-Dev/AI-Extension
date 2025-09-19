import { TERMS } from "./glossary.js";
export function rewriteSimple(text: string): string {
  let out = text;
  for (const entry of TERMS) {
    const regex = new RegExp(`\\b${entry.term}\\b`, 'gi');
    out = out.replace(regex, `${entry.term} (${entry.simple})`);
  }
  return out.replace(/\\b(utilize|leverage)\\b/gi, 'use');
}
