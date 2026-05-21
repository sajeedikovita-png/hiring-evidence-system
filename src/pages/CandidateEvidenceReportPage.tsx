import React from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { WarningCard } from "../../components/ui/WarningCard";
import { CandidateDetailPanel } from "../components/report/CandidateDetailPanel";
import { CandidateHeader } from "../components/report/CandidateHeader";
import { EvidenceMatrix } from "../components/report/EvidenceMatrix";
import { FairnessCheckCard } from "../components/report/FairnessCheckCard";
import { HumanDecisionPanel } from "../components/report/HumanDecisionPanel";
import { ReportSupportSections } from "../components/report/ReportSupportSections";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import { candidateReport } from "../data/mockHiringData";

export function CandidateEvidenceReportPage() {
  return (
    <RecruiterShell
      active="reports"
      title="Candidate Evidence Report"
      subtitle="Review job-related evidence, missing proof, fairness checks, and human decision notes."
      primaryAction="Final decision"
      secondaryAction="Share report"
    >
      <main className="workspace-content">
        <CandidateHeader candidate={candidateReport.candidate} />

        <section className="dashboard-metrics">
          {candidateReport.summaryCards.map((card) => (
            <Card key={card.label} title={card.label} meta={card.tone ? undefined : "Report ready"}>
              <div className="summary-card-heading">
                <p className="metric">{card.value}</p>
                {card.tone ? <Badge tone={card.tone}>{card.label}</Badge> : null}
              </div>
              <p className="muted">{card.detail}</p>
            </Card>
          ))}
        </section>

        <WarningCard title="AI-assisted analysis. Human review is required before making any hiring decision.">
          Review evidence, verify missing proof, and record a job-related decision reason before changing candidate status.
        </WarningCard>

        <div className="report-layout">
          <CandidateDetailPanel candidate={candidateReport.candidate} fairness={candidateReport.fairness} />
          <div className="report-main-column">
            <EvidenceMatrix rows={candidateReport.evidenceRows} />
            <ReportSupportSections
              missingEvidence={candidateReport.missingEvidence}
              interviewQuestions={candidateReport.interviewQuestions}
              recruiterNotes={candidateReport.recruiterNotes}
            />
            <FairnessCheckCard fairness={candidateReport.fairness} />
            <HumanDecisionPanel options={candidateReport.decisionOptions} />
            <div className="report-export-row">
              <p className="muted">PDF export is a front-end placeholder in this MVP phase.</p>
              <Button variant="secondary">Export PDF</Button>
            </div>
          </div>
        </div>
      </main>
    </RecruiterShell>
  );
}
