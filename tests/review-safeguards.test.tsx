import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CandidateDetailPanel } from "../src/components/report/CandidateDetailPanel";
import { FairnessCheckCard } from "../src/components/report/FairnessCheckCard";
import { getReviewSafeguardsView } from "../src/services/reviewSafeguardsService";
import type { CandidateProfile } from "../src/types/hiring";

const legacyFairness = {
  status: "Fairness check passed",
  protectedCharacteristicsStatus: "Protected characteristics not used",
  decisionWordingWarning: "None",
  reminder: "Verify evidence before recording a recruiter decision.",
  protectedCharacteristics: ["Age", 7, "", null, "Age", " Gender "]
};

const legacyView = getReviewSafeguardsView(legacyFairness);
assert.equal(legacyView.status, "Not checked");
assert.equal(legacyView.checkStatus, "Not checked");
assert.equal(legacyView.protectedCharacteristicsStatus, "Not checked");
assert.equal(legacyView.decisionWordingWarning, "No recorded warning");
assert.deepEqual(legacyView.protectedCharacteristics, ["Age", "Gender"]);
assert.match(legacyView.reminder, /Verify evidence/);

const absentView = getReviewSafeguardsView(undefined);
assert.equal(absentView.status, "Not checked");
assert.match(absentView.scopeMessage, /No verified safeguard scope/);

const invalidView = getReviewSafeguardsView({
  status: ["passed"],
  protectedCharacteristics: "Age",
  decisionWordingWarning: { text: "none" },
  reminder: 4
});
assert.equal(invalidView.status, "Not checked");
assert.equal(invalidView.decisionWordingWarning, "No recorded warning");
assert.deepEqual(invalidView.protectedCharacteristics, []);
assert.match(invalidView.reminder, /Human review required/);

const warningView = getReviewSafeguardsView({ decisionWordingWarning: "Avoid a conclusion unsupported by the interview record." });
assert.equal(warningView.decisionWordingWarning, "Avoid a conclusion unsupported by the interview record.");

const candidate: CandidateProfile = {
  name: "Ari Patel",
  role: "Account manager",
  company: "Northstar Digital",
  appliedDate: "2026-09-09",
  reportGenerated: "2026-09-09",
  reportId: "HER-1",
  assignedRecruiter: "Riley",
  currentStatus: "Under review",
  consentStatus: "Recorded",
  questionnaireStatus: "Complete",
  resumeLabel: "resume.pdf",
  statusBadges: []
};
const cardHtml = renderToStaticMarkup(<FairnessCheckCard fairness={legacyFairness as never} />);
const sidebarHtml = renderToStaticMarkup(<CandidateDetailPanel candidate={candidate} fairness={legacyFairness as never} />);

for (const html of [cardHtml, sidebarHtml]) {
  assert.match(html, /Not checked/);
  assert.match(html, /Human review required/);
  assert.match(html, /source claims still need verification/i);
  assert.doesNotMatch(html, /Passed|Confirmed|Protected characteristics not used/);
}
assert.match(cardHtml, /Age/);
assert.match(cardHtml, /Gender/);
assert.doesNotMatch(cardHtml, />7</);
assert.match(cardHtml, /Verify evidence before recording a recruiter decision/);

console.log("review safeguards tests passed");
