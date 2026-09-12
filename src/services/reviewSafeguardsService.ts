import type { BadgeTone } from "../types/hiring";

type UnknownRecord = Record<string, unknown>;

export type ReviewSafeguardsView = {
  status: "Not checked";
  badgeTone: BadgeTone;
  checkStatus: "Not checked";
  protectedCharacteristicsStatus: "Not checked";
  decisionWordingWarning: string;
  reminder: string;
  protectedCharacteristics: string[];
  scopeMessage: string;
  summary: string;
};

const DEFAULT_REMINDER = "Human review required. Source claims and decision wording still need verification.";
const DEFAULT_WARNING = "No recorded warning";

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : undefined;
}

function asMeaningfulText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text : undefined;
}

function recordedWarning(value: unknown): string {
  const warning = asMeaningfulText(value);
  return warning && !/^(none|n\/?a|not applicable)$/i.test(warning) ? warning : DEFAULT_WARNING;
}

function recordedScope(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map(asMeaningfulText).filter((item): item is string => Boolean(item)))];
}

/**
 * Converts an untrusted or legacy fairness payload into language that does not
 * imply a completed fairness review. A phrase-based legacy status alone is not
 * evidence that a safeguard was run or that protected characteristics were not used.
 */
export function getReviewSafeguardsView(fairness: unknown): ReviewSafeguardsView {
  const source = asRecord(fairness);
  const protectedCharacteristics = recordedScope(source?.protectedCharacteristics);
  const sourceReminder = asMeaningfulText(source?.reminder);
  const reminder = sourceReminder ? `${sourceReminder} ${DEFAULT_REMINDER}` : DEFAULT_REMINDER;

  return {
    status: "Not checked",
    badgeTone: "warning",
    checkStatus: "Not checked",
    protectedCharacteristicsStatus: "Not checked",
    decisionWordingWarning: recordedWarning(source?.decisionWordingWarning),
    reminder,
    protectedCharacteristics,
    scopeMessage:
      protectedCharacteristics.length > 0
        ? "Recorded scope items are not proof that a safeguard was completed or that any characteristic was excluded."
        : "No verified safeguard scope is recorded.",
    summary: "Not checked. Human review required; source claims still need verification."
  };
}
