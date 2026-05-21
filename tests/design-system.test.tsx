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

const shellHtml = renderToStaticMarkup(
  <AppShell>
    <main>Evidence workspace</main>
  </AppShell>
);

assert.match(shellHtml, /Hiring Evidence System/);
assert.match(shellHtml, /aria-label="Main navigation"/);
assert.match(shellHtml, /AI assists\. Human decides\./);
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

console.log("Phase 2 design system smoke test passed.");
