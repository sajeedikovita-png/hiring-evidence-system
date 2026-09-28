import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandidateIdentityPanel } from "../src/components/report/CandidateIdentityPanel";

test("candidate identity panel explains its limited purpose", () => {
  const html = renderToStaticMarkup(<CandidateIdentityPanel applicationId="00000000-0000-0000-0000-000000000025" />);
  assert.match(html, /Confirm the name used in reports/);
  assert.match(html, /does not verify qualifications, consent, or identity/);
  assert.doesNotMatch(html, /automatically verified|guaranteed/i);
});
