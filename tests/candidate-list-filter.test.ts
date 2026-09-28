import assert from "node:assert/strict";
import test from "node:test";
import { filterCandidateRows } from "../src/pages/JobCandidateListPage";
import type { JobCandidateRow } from "../src/types/hiring";

const row = (name: string, criteria: JobCandidateRow["criterionStatuses"]): JobCandidateRow => ({
  id: name, candidateName: name, candidateNameSource: "recorded", applicationId: name,
  evidenceLevel: "Good evidence, verification needed", reportStatus: { label: "Report ready", tone: "success" },
  reviewStatus: { label: "Human review required", tone: "info" }, uploadedFile: `${name}.pdf`, updatedAt: "today", reportPath: "/reports/1",
  evidenceCounts: { found: 1, needsVerification: 0, missing: 1, total: 2 }, evidenceReviewGroup: "Missing evidence", criterionStatuses: criteria
});

test("requirement and criterion status filters apply to the same criterion", () => {
  const rows = [row("React found, stakeholder missing", [
    { criteriaId: "react", requirement: "React production experience", status: "found" },
    { criteriaId: "stakeholder", requirement: "Stakeholder communication", status: "missing" }
  ]), row("React missing", [{ criteriaId: "react", requirement: "React production experience", status: "missing" }])];
  assert.deepEqual(filterCandidateRows(rows, { requirement: "React", criterionStatus: "missing" }).map((item) => item.candidateName), ["React missing"]);
});

test("unprocessed records remain visible until a criterion status filter is applied", () => {
  const unprocessed = row("Unprocessed CV", []);
  unprocessed.evidenceReviewGroup = "No criterion evidence";
  const rows = [unprocessed];
  assert.equal(filterCandidateRows(rows, {}).length, 1);
  assert.equal(filterCandidateRows(rows, { search: "Unprocessed" }).length, 1);
  assert.equal(filterCandidateRows(rows, { group: "No criterion evidence" }).length, 1);
  assert.equal(filterCandidateRows(rows, { criterionStatus: "missing" }).length, 0);
});
