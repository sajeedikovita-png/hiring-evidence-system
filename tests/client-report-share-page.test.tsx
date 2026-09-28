import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedClientReportState } from "../src/pages/SharedClientReportPage";
import { ClientReportShareControls } from "../src/components/report/ClientReportShareControls";
import { createClientHandoff } from "../src/services/clientHandoffService";
import { getPublicSyntheticSampleReport } from "../src/services/hiringRepository";

test("shared report starts with a clear loading state and no candidate data", () => {
  const html = renderToStaticMarkup(<SharedClientReportState state="loading" />);
  assert.match(html, /Opening client summary/);
  assert.doesNotMatch(html, /Job-related evidence|Print \/ save PDF/);
});

test("invalid expired and revoked access have the same unavailable view without old report data", () => {
  const summary = createClientHandoff(getPublicSyntheticSampleReport());
  summary.candidateName = "SECRET CANDIDATE";
  const html = renderToStaticMarkup(<SharedClientReportState state="unavailable" report={{ summary, expiresAt: "2026-09-01T00:00:00Z" }} />);
  assert.match(html, /Summary unavailable/);
  assert.match(html, /invalid, expired, or revoked/);
  assert.doesNotMatch(html, /SECRET CANDIDATE|Job-related evidence/);
});

test("approved summary is read-only and escapes source text", () => {
  const summary = createClientHandoff(getPublicSyntheticSampleReport());
  summary.candidateName = '<img src=x onerror="alert(1)">';
  const html = renderToStaticMarkup(<SharedClientReportState state="ready" report={{ summary, expiresAt: "2027-01-01T00:00:00Z" }} />);
  assert.match(html, /Read-only snapshot/);
  assert.match(html, /Human review required/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|Save decision|recruiterNotes|auditTrailPreview|documentSources/);
});

test("link creation requires explicit disclosure confirmation and shows bearer-link risk", () => {
  const html = renderToStaticMarkup(<ClientReportShareControls reportId="test-report" includeDecision={false} />);
  assert.match(html, /Anyone with this link/);
  assert.match(html, /There is no recipient sign-in/);
  assert.match(html, /authorised to disclose/);
  assert.match(html, /disabled=""[^>]*>Create client link/);
  assert.match(html, /7 days/);
  assert.match(html, /30 days/);
});
