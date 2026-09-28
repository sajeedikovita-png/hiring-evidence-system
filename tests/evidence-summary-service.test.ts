import assert from "node:assert/strict";
import test from "node:test";
import { summarizeEvidence } from "../src/services/evidenceSummaryService";
import type { EvidenceItem } from "../src/types/hiring";

function item(id: string, label: string, evidence = "Source grounded evidence"): EvidenceItem {
  return {
    id,
    reportId: "report-1",
    applicationId: "application-1",
    criteriaId: id,
    requirement: id,
    evidence,
    source: "Resume",
    confidence: "High",
    verificationNeeded: "Ask a human follow-up question",
    status: { label, tone: label === "Strong evidence" ? "success" : "warning" }
  };
}

test("summarizes explicit criterion statuses without treating follow-up prompts as uncertainty", () => {
  const summary = summarizeEvidence([
    item("react", "Strong evidence"),
    item("collaboration", "Strong evidence"),
    item("aws", "Needs verification")
  ]);

  assert.deepEqual(summary.counts, { found: 2, needsVerification: 1, missing: 0, total: 3 });
  assert.equal(summary.reviewGroup, "Verification needed");
  assert.equal(summary.evidenceLevel, "Good evidence, verification needed");
  assert.deepEqual(summary.items.map((entry) => entry.criterionStatus), ["found", "found", "needs_verification"]);
});

test("missing criterion evidence takes precedence over verification group", () => {
  const summary = summarizeEvidence([item("react", "Evidence found"), item("aws", "Missing evidence", "")]);

  assert.deepEqual(summary.counts, { found: 1, needsVerification: 0, missing: 1, total: 2 });
  assert.equal(summary.reviewGroup, "Missing evidence");
  assert.equal(summary.evidenceLevel, "Missing key evidence");
});

test("unknown statuses remain conservative for human review", () => {
  const summary = summarizeEvidence([item("criterion", "Unrecognised status")]);
  assert.equal(summary.counts.needsVerification, 1);
  assert.equal(summary.items[0].criterionStatus, "needs_verification");
});
