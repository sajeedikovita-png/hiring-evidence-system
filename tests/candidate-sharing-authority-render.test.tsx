import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandidateSharingAuthorityPanel } from "../src/components/report/CandidateSharingAuthorityPanel";
import { ClientReportShareControls } from "../src/components/report/ClientReportShareControls";

test("sharing authority explains its scope and starts safely", () => {
  const html = renderToStaticMarkup(<CandidateSharingAuthorityPanel applicationId="00000000-0000-0000-0000-000000000025" />);
  assert.match(html, /Candidate sharing authority/);
  assert.match(html, /separate from authority to upload a CV/);
  assert.match(html, /does not determine whether sharing is legally permitted/);
  assert.doesNotMatch(html, /guaranteed|compliant/i);
});

test("client-link creation is visibly blocked without active authority", () => {
  const html = renderToStaticMarkup(<ClientReportShareControls reportId="report" includeDecision={false} authorityActive={false} />);
  assert.match(html, /Blocked:.*record active candidate sharing authority/);
  assert.match(html, /disabled=""[^>]*>Create client link/);
});
