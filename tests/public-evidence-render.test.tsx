import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicEvidenceResult } from "../src/components/report/PublicProfessionalEvidenceSection";
import { mapPublicEvidence } from "../src/services/publicEvidenceService";

const source = mapPublicEvidence({ id: "source-1", status: "ready", analysis: {
  summary: "Release documented.", requirementLinks: [{criteriaId: "role-1", finding: "Published app.", status: "Supporting evidence", verificationNeeded: "Confirm authorship."}]
}});
const html = renderToStaticMarkup(<PublicEvidenceResult source={source} criteria={[{criteriaId: "role-1", requirement: "Ship mobile applications"}]} />);
assert.match(html, /Ship mobile applications/);
assert.match(html, /Confirm authorship/);
const missing = renderToStaticMarkup(<PublicEvidenceResult source={source} criteria={[]} />);
assert.match(missing, /Role criterion unavailable/);
const failed = renderToStaticMarkup(<PublicEvidenceResult source={mapPublicEvidence({status: "failed"})} criteria={[]} />);
assert.match(failed, /Comparison failed/);
assert.match(failed, /review it manually/);
assert.doesNotMatch(failed, /being prepared/);
console.log("public evidence rendering tests passed");
