import glossary from "../glossary/finance-terms.en.json" assert { type: "json" };
export interface GlossaryEntry { term: string; simple: string; detail: string; }
export const TERMS: GlossaryEntry[] = glossary as GlossaryEntry[];
export function lookup(term: string): GlossaryEntry | undefined {
  return TERMS.find(t => t.term.toLowerCase() === term.toLowerCase());
}
