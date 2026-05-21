import React from "react";
import { AppShell } from "../components/layout/AppShell";
import { PageContainer } from "../components/layout/PageContainer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { NoteTextArea } from "../components/ui/NoteTextArea";
import { WarningCard } from "../components/ui/WarningCard";

const evidenceRows = [
  {
    requirement: "React production experience",
    evidence: "Resume shows two shipped dashboard projects using React",
    source: "Resume",
    confidence: <Badge tone="success">High</Badge>,
    verification: "Ask architecture question",
    status: <Badge tone="success">Strong evidence</Badge>
  },
  {
    requirement: "AWS deployment work",
    evidence: "No clear deployment ownership found",
    source: "Resume",
    confidence: <Badge tone="danger">Low</Badge>,
    verification: "Ask candidate directly",
    status: <Badge tone="warning">Needs verification</Badge>
  },
  {
    requirement: "Role-related collaboration",
    evidence: "Questionnaire answer mentions cross-functional planning",
    source: "Questionnaire",
    confidence: <Badge tone="info">Medium</Badge>,
    verification: "Ask stakeholder communication follow-up",
    status: <Badge tone="info">Human review required</Badge>
  }
];

const candidateDetails = [
  { label: "Candidate", value: "Amanda Lee" },
  { label: "Role applied for", value: "Frontend Developer" },
  { label: "Company / job", value: "Northstar Digital" },
  { label: "Applied", value: "21 May 2026" },
  { label: "Report generated", value: "Today, 4:15 PM" },
  { label: "Reviewer", value: "Sarah Tan" }
];

const protectedCharacteristics = [
  "Age",
  "Gender",
  "Race",
  "Religion",
  "Marital status",
  "Pregnancy or caregiving status",
  "Disability or mental health status",
  "Photo",
  "Nationality unless job-relevant"
];

const decisionOptions = ["Shortlist", "Invite to interview", "Hold", "Needs more evidence", "Reject"];

export function App() {
  return (
    <AppShell>
      <PageContainer
        eyebrow="Candidate Review"
        title="Candidate Evidence Report"
        description="A calm recruiter workspace for reviewing job-related evidence, missing proof, fairness checks, and human decision notes."
        actions={
          <>
            <Button variant="secondary">Export PDF</Button>
            <Button>Save decision</Button>
          </>
        }
      >
        <section className="candidate-summary" aria-label="Candidate summary">
          <div className="candidate-summary-main">
            <div>
              <p className="section-kicker">Candidate Summary</p>
              <h2>Amanda Lee</h2>
              <p className="candidate-role">Frontend Developer at Northstar Digital</p>
            </div>
            <Badge tone="info">Human review required</Badge>
          </div>
          <dl className="candidate-details">
            {candidateDetails.map((detail) => (
              <div key={detail.label} className="detail-item">
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
            <div className="detail-item">
              <dt>Current review status</dt>
              <dd>Human review required</dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-grid" aria-label="Report summary">
          <Card title="Evidence match" meta="Report ready">
            <p className="metric">Good evidence, verification needed</p>
            <p className="muted">Evidence is organized by job criteria, not by automated candidate ranking.</p>
          </Card>
          <Card title="Verification needed" meta="2 criteria">
            <p className="metric">2 criteria need verification</p>
            <p className="muted">Use structured follow-up questions before changing the review status.</p>
          </Card>
          <Card title="Missing evidence" meta="2 open items">
            <p className="metric">2 criteria need verification</p>
            <p className="muted">AWS deployment ownership and stakeholder communication details need more proof.</p>
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
            { key: "requirement", header: "Job requirement" },
            { key: "evidence", header: "Candidate evidence" },
            { key: "source", header: "Source" },
            { key: "confidence", header: "Confidence" },
            { key: "verification", header: "Verification needed" },
            { key: "status", header: "Status" }
          ]}
          rows={evidenceRows}
        />

        <section className="fairness-card" aria-label="Fairness check">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Fairness Check</p>
              <h2>Review safeguards</h2>
            </div>
            <Badge tone="success">Passed</Badge>
          </div>
          <div className="fairness-grid">
            <div className="fairness-status-panel">
              <div className="fairness-status-item">
                <span>Fairness check status</span>
                <strong>Passed</strong>
              </div>
              <div className="fairness-status-item">
                <span>Protected characteristics not used</span>
                <strong>Confirmed</strong>
              </div>
              <div className="fairness-status-item">
                <span>Decision wording warning</span>
                <strong>None</strong>
              </div>
              <p className="muted">Human review reminder: verify the evidence and decision wording before saving a final outcome.</p>
            </div>
            <div className="protected-list-panel">
              <h3>Protected characteristics not used</h3>
              <ul className="protected-list">
                {protectedCharacteristics.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="decision-section" aria-label="Human decision">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Human Decision</p>
              <h2>Record review outcome</h2>
            </div>
            <Badge tone="info">Human review required</Badge>
          </div>
          <fieldset className="decision-options">
            <legend>Decision options</legend>
            {decisionOptions.map((option) => (
              <label key={option} className="decision-option">
                <input type="radio" name="decision" />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <NoteTextArea label="Required decision reason" placeholder="Write the job-related evidence and verification notes that support this human decision." />
          <div className="decision-footer">
            <p className="muted">Final decision must be based on job-related evidence and reviewed by a human.</p>
            <Button>Save decision</Button>
          </div>
        </section>

        <section className="review-notes-section" aria-label="Recruiter notes">
          <NoteTextArea label="Recruiter notes" placeholder="Add job-related evidence notes, interview questions, or verification reminders." />
        </section>
      </PageContainer>
    </AppShell>
  );
}
