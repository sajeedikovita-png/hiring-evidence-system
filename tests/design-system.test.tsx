import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShell } from "../components/layout/AppShell";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { NoteTextArea } from "../components/ui/NoteTextArea";
import { WarningCard } from "../components/ui/WarningCard";
import { App } from "../src/App";

const shellHtml = renderToStaticMarkup(
  <AppShell>
    <main>Evidence workspace</main>
  </AppShell>
);

assert.match(shellHtml, /Hiring Evidence System/);
assert.match(shellHtml, /aria-label="Main navigation"/);
assert.match(shellHtml, /AI assists\. Human decides\./);
assert.match(shellHtml, /Search evidence/);
assert.match(shellHtml, /Final decision/);
assert.match(shellHtml, /Evidence workspace/);

const componentHtml = renderToStaticMarkup(
  <>
    <Button>Create job</Button>
    <Card title="Candidate Evidence Report">Evidence match overview</Card>
    <Badge tone="warning">Needs verification</Badge>
    <DataTable
      caption="Evidence matrix"
      columns={[
        { key: "criterion", header: "Job criteria" },
        { key: "evidence", header: "Evidence match" }
      ]}
      rows={[{ criterion: "React experience", evidence: "Resume project evidence" }]}
    />
    <EmptyState title="No candidates yet" description="Share the application link when the job is ready." />
    <WarningCard title="Human review required">AI-assisted analysis requires recruiter review.</WarningCard>
    <NoteTextArea label="Recruiter notes" placeholder="Add job-related evidence notes." />
  </>
);

assert.match(componentHtml, /<button[^>]*>Create job<\/button>/);
assert.match(componentHtml, /Candidate Evidence Report/);
assert.match(componentHtml, /Needs verification/);
assert.match(componentHtml, /<caption>Evidence matrix<\/caption>/);
assert.match(componentHtml, /No candidates yet/);
assert.match(componentHtml, /Human review required/);
assert.match(componentHtml, /Recruiter notes/);

const landingHtml = renderToStaticMarkup(<App path="/" />);
const loginHtml = renderToStaticMarkup(<App path="/login" />);
const dashboardHtml = renderToStaticMarkup(<App path="/dashboard" />);
const reportHtml = renderToStaticMarkup(<App path="/reports/candidate-evidence" />);
const combinedAppHtml = [landingHtml, loginHtml, dashboardHtml, reportHtml].join("\n");

assert.match(landingHtml, /Hire with evidence, not guesswork\./);
assert.match(landingHtml, /View sample report/);
assert.match(landingHtml, /Request pilot access/);
assert.match(landingHtml, /Human-led hiring/);

assert.match(loginHtml, /Sign in/);
assert.match(loginHtml, /Access candidate evidence reports/);

assert.match(dashboardHtml, /Evidence Ledger/);
assert.match(dashboardHtml, /Active jobs/);
assert.match(dashboardHtml, /Candidates waiting for review/);
assert.match(dashboardHtml, /Reports completed/);
assert.match(dashboardHtml, /Decisions needing sign-off/);
assert.match(dashboardHtml, /Open report/);

assert.doesNotMatch(reportHtml, /Design system preview/i);
assert.match(reportHtml, /Candidate Evidence Report/);
assert.match(reportHtml, /Amanda Lee/);
assert.match(reportHtml, /Frontend Developer/);
assert.match(reportHtml, /Northstar Digital/);
assert.match(reportHtml, /Today, 4:15 PM/);
assert.match(reportHtml, /HER-2026-0521-AL/);
assert.match(reportHtml, /Evidence report ready/);
assert.match(reportHtml, /Verification needed/);
assert.match(reportHtml, /Human review required/);
assert.match(reportHtml, /Good evidence, verification needed/);
assert.match(reportHtml, /2 evidence gaps/);
assert.match(reportHtml, /Requirement/);
assert.match(reportHtml, /Candidate evidence/);
assert.match(reportHtml, /Missing evidence/);
assert.match(reportHtml, /Suggested interview questions/);
assert.match(reportHtml, /View resume/);
assert.match(reportHtml, /Protected characteristics not used/);
assert.match(reportHtml, /Invite to interview/);
assert.match(reportHtml, /Export PDF/);
assert.match(reportHtml, /Final decision must be based on job-related evidence and reviewed by a human/);
assert.match(reportHtml, /AI-assisted analysis\. Human review is required before making any hiring decision\./);
assert.doesNotMatch(
  combinedAppHtml,
  /Consolidated Auditor Suggestion|Verified Match|Best candidate|Perfect match|AI selected|AI rejected|AI recommendation|Accept Path|Auto decision|Auto reject|Culture fit score|Personality score|Bias-free/i
);

console.log("Front-end MVP route smoke test passed.");
