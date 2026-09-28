import assert from "node:assert/strict";
import test from "node:test";
import { createClientHandoff } from "../src/services/clientHandoffService";
import { getPublicSyntheticSampleReport } from "../src/services/hiringRepository";

function fixture() {
  const report = structuredClone(getPublicSyntheticSampleReport());
  report.candidate.email = "private@example.test";
  report.recruiterNotes = ["PRIVATE INTERNAL NOTE"];
  report.documentSources[0].fileUrl = "https://storage.example.test/private?token=secret";
  report.requirementEvidence[0].sourceReference = "CV page 2 https://storage.example.test/private?token=secret person@example.test";
  report.humanDecision.draft = { id: "d", reportId: report.id, applicationId: report.application.id, recruiterId: "private-user-id", decision: "Hold for review", reason: "OPTIONAL DECISION REASON", status: "saved", createdAt: "2026-09-19T07:00:00Z" };
  return report;
}

test("client summary excludes private metadata, notes, document links and decision by default", () => {
  const result = createClientHandoff(fixture(), { preparedAt: "2026-09-19T07:30:00Z", branding: {displayName:"Northstar Search",heading:"Evidence brief",footer:"Reviewed by a human.",accentColor:"#59406f",logoUrl:"https://example.test/logo.png"} });
  const serialized = JSON.stringify(result);
  for (const secret of ["PRIVATE INTERNAL NOTE", "private@example.test", "token=secret", "OPTIONAL DECISION REASON", "private-user-id", "auditTrailPreview", "documentSources"]) assert.ok(!serialized.includes(secret), secret);
  assert.equal(result.preparedAt, "2026-09-19T07:30:00Z");
  assert.equal(result.status, "Human review required");
  assert.equal(result.branding.heading, "Evidence brief");
  assert.equal(result.branding.displayName, "Northstar Search");
  assert.equal(result.branding.logoUrl, "https://example.test/logo.png");
  assert.equal(result.criteria[0].sourceReference, "CV page 2 [link omitted] [email omitted]");
});

test("client summary uses safe branding defaults and rejects an unsafe logo URL", () => {
  const result=createClientHandoff(fixture(),{branding:{logoUrl:"data:text/html,unsafe"}});
  assert.equal(result.branding.logoUrl,"");
  assert.equal(result.branding.heading,"Candidate evidence summary");
  assert.equal(result.branding.accentColor,"#28543f");
});

test("internal recruiter-note findings are replaced without dropping the requirement", () => {
  const report = fixture();
  report.requirementEvidence[0].source = "Recruiter note";
  report.requirementEvidence[0].evidence = "PRIVATE FINDING";
  report.requirementEvidence[0].verificationNeeded = "PRIVATE FOLLOWUP";
  const result = createClientHandoff(report);
  assert.equal(result.criteria.length, report.requirementEvidence.length);
  assert.equal(result.criteria[0].requirement, report.requirementEvidence[0].requirement);
  assert.equal(result.criteria[0].status, "Needs verification");
  assert.ok(!JSON.stringify(result).includes("PRIVATE"));
});

test("only explicit inclusion exports saved human decision reason; drafts stay private", () => {
  const report = fixture();
  assert.equal(createClientHandoff(report, { includeDecision: true }).decision?.reason, "OPTIONAL DECISION REASON");
  assert.equal(createClientHandoff(report, { includeDecision: true }).decision?.recordedAt, "2026-09-19T07:00:00Z");
  report.humanDecision.draft!.status = "draft";
  assert.equal(createClientHandoff(report, { includeDecision: true }).decision, undefined);
});
