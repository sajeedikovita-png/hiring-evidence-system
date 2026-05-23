export const forbiddenHiringPhrases = [
  "best candidate",
  "AI selected",
  "AI rejected",
  "AI decides",
  "auto reject",
  "automatic hiring decision",
  "bias-free",
  "guaranteed fair",
  "perfect match"
];

export const safeHiringPrinciple = "AI assists. Human decides. Evidence explains.";

export function containsForbiddenHiringLanguage(content: string): boolean {
  const normalizedContent = content.toLowerCase();

  return forbiddenHiringPhrases.some((phrase) => normalizedContent.includes(phrase.toLowerCase()));
}

export function getForbiddenHiringLanguage(content: string): string[] {
  const normalizedContent = content.toLowerCase();

  return forbiddenHiringPhrases.filter((phrase) => normalizedContent.includes(phrase.toLowerCase()));
}
