import type {
  EvidenceCounts,
  EvidenceCriterionStatus,
  EvidenceItem,
  EvidenceLevel,
  EvidenceReviewGroup,
  SummaryMetric
} from "../types/hiring";

const missingLabels = new Set(["missing evidence", "missing key evidence"]);
const verificationLabels = new Set(["needs verification", "human review required", "needs human review"]);
const foundLabels = new Set(["strong evidence", "evidence found", "supporting evidence"]);

export function getEvidenceCriterionStatus(item: Pick<EvidenceItem, "status" | "evidence" | "verificationNeeded">): EvidenceCriterionStatus {
  const label = item.status.label.trim().toLowerCase();
  if (missingLabels.has(label) || !item.evidence.trim()) return "missing";
  if (verificationLabels.has(label)) return "needs_verification";
  if (foundLabels.has(label)) return "found";
  return "needs_verification";
}

export function summarizeEvidence(items: EvidenceItem[]): {
  items: EvidenceItem[];
  counts: EvidenceCounts;
  reviewGroup: EvidenceReviewGroup;
  evidenceLevel: EvidenceLevel;
  summaryCards: SummaryMetric[];
} {
  const mappedItems = items.map((item) => ({ ...item, criterionStatus: getEvidenceCriterionStatus(item) }));
  const counts = mappedItems.reduce<EvidenceCounts>(
    (result, item) => {
      result[item.criterionStatus === "needs_verification" ? "needsVerification" : item.criterionStatus] += 1;
      result.total += 1;
      return result;
    },
    { found: 0, needsVerification: 0, missing: 0, total: 0 }
  );
  const reviewGroup: EvidenceReviewGroup =
    counts.total === 0
      ? "No criterion evidence"
      : counts.missing > 0
        ? "Missing evidence"
        : counts.needsVerification > 0
          ? "Verification needed"
          : "All evidence found";
  const evidenceLevel: EvidenceLevel =
    reviewGroup === "All evidence found"
      ? "Strong evidence"
      : reviewGroup === "Verification needed"
        ? "Good evidence, verification needed"
        : reviewGroup === "Missing evidence"
          ? "Missing key evidence"
          : "Needs human review";

  const summaryCards: SummaryMetric[] = [
    {
      label: "Evidence found",
      value: `${counts.found} of ${counts.total} ${counts.total === 1 ? "criterion" : "criteria"}`,
      detail: `Overall evidence group: ${evidenceLevel}. Evidence is organized by job-related criteria.`,
      tone: counts.found > 0 ? "success" : "neutral"
    },
    {
      label: "Needs verification",
      value: `${counts.needsVerification} ${counts.needsVerification === 1 ? "criterion" : "criteria"}`,
      detail: counts.needsVerification > 0 ? `${counts.needsVerification} evidence gaps require verification. Verification needed before review is complete.` : "No criterion is currently marked for verification.",
      tone: counts.needsVerification > 0 ? "warning" : "neutral"
    },
    {
      label: "Missing evidence",
      value: `${counts.missing} ${counts.missing === 1 ? "criterion" : "criteria"}`,
      detail: counts.total === 0
        ? "No saved criterion findings are available for this record."
        : counts.missing > 0
          ? "These criteria do not yet have usable evidence."
          : "No criteria are marked as missing evidence. Review verification notes before deciding.",
      tone: counts.missing > 0 ? "danger" : "neutral"
    },
    {
      label: "Human decision",
      value: "Decision reason required",
      detail: "Final decisions stay with the hiring team.",
      tone: "info"
    }
  ];

  return { items: mappedItems, counts, reviewGroup, evidenceLevel, summaryCards };
}
