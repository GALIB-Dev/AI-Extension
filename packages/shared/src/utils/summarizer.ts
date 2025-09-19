export function summarize(text: string, maxSentences = 3): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= maxSentences) return text;
  const freq: Record<string, number> = {};
  const stop = new Set(["the","and","of","a","to","in","for","on","is","are","with","that","this"]);
  const words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  words.forEach(w => { if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const scored = sentences.map(s => {
    const sWords = s.toLowerCase().match(/[a-z]{3,}/g) || [];
    const score = sWords.reduce((acc,w)=> acc + (freq[w]||0), 0) / (sWords.length || 1);
    return { s, score };
  });
  return scored.sort((a,b)=> b.score - a.score)
                .slice(0, maxSentences)
                .map(o=> o.s)
                .join(' ');
}
