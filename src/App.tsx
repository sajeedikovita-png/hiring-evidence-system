import React from "react";
import { AppShell } from "../components/layout/AppShell";
import { PageContainer } from "../components/layout/PageContainer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { NoteTextArea } from "../components/ui/NoteTextArea";
import { WarningCard } from "../components/ui/WarningCard";

const evidenceRows = [
  {
    criterion: "React production experience",
    evidence: "Resume project evidence across two shipped dashboards",
    status: <Badge tone="success">Strong evidence</Badge>
  },
  {
    criterion: "AWS deployment work",
    evidence: "No clear deployment ownership found yet",
    status: <Badge tone="warning">Needs verification</Badge>
  },
  {
    criterion: "Role-related collaboration",
    evidence: "Questionnaire answer references cross-functional planning",
    status: <Badge tone="info">Human review required</Badge>
  }
];

export function App() {
  return (
    <AppShell>
      <PageContainer
        eyebrow="Design system preview"
        title="Candidate Evidence Report"
        description="A calm recruiter workspace for reviewing job-related evidence, missing proof, fairness checks, and human decision notes."
        actions={
          <>
            <Button variant="secondary">Export PDF</Button>
            <Button>Save decision</Button>
          </>
        }
      >
        <section className="dashboard-grid" aria-label="Report summary">
          <Card title="Evidence match" meta="Report ready">
            <p className="metric">Good evidence needs verification</p>
            <p className="muted">Evidence is organized by job criteria, not by automated candidate ranking.</p>
          </Card>
          <Card title="Missing evidence" meta="2 open items">
            <p className="metric">AWS deployment, stakeholder metrics</p>
            <p className="muted">Use interview questions to verify gaps before making a decision.</p>
          </Card>
          <Card title="Human decision" meta="Not saved">
            <p className="metric">Decision reason required</p>
            <p className="muted">Final decision must be based on job-related criteria and reviewed by a human.</p>
          </Card>
        </section>

        <WarningCard title="AI-assisted analysis. Human review is required before making any hiring decision.">
          Review the evidence, verify missing proof, and record your own decision reason before changing candidate status.
        </WarningCard>

        <DataTable
          caption="Evidence matrix"
          columns={[
            { key: "criterion", header: "Job criteria" },
            { key: "evidence", header: "Evidence match" },
            { key: "status", header: "Status" }
          ]}
          rows={evidenceRows}
        />

        <section className="two-column-grid" aria-label="Notes and empty state examples">
          <NoteTextArea label="Recruiter notes" placeholder="Add job-related evidence notes." />
          <EmptyState title="No fairness warnings" description="Fairness checks will appear here when wording needs review." />
        </section>
      </PageContainer>
    </AppShell>
  );
}
