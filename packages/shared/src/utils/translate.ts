export function translateStub(text: string, targetLang: string): string {
  if (targetLang.toLowerCase() === 'en') return text;
  return `[${targetLang.toUpperCase()} translation placeholder] ${text}`;
}
