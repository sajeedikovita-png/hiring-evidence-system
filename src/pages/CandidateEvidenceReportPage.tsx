import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import { getActiveCompanyContext, type CompanyContext } from "../services/companyContextService";
import { getAsyncHiringRepository, getReportById } from "../services/hiringRepository";
import type { CandidateProfile, EvidenceReport, ReviewDecision } from "../types/hiring";

export function CandidateEvidenceReportPage() {
  const { reportId } = useParams();
  const repository = useMemo(() => getAsyncHiringRepository(), []);
  const companyContext = getActiveCompanyContext();
  const [activeContext, setActiveContext] = useState<CompanyContext>(companyContext);
  const selectedReportId = reportId ?? "report-amanda-lee";
  const [evidenceReport, setEvidenceReport] = useState<EvidenceReport | undefined>(() =>
    repository.source === "seed" ? getReportById(companyContext.companyId, selectedReportId) : undefined
  );

  useEffect(() => {
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then((context) => {
        if (isMounted) setActiveContext(context);
        return repository.getReportById(context.companyId, selectedReportId);
      })
      .then((nextReport) => {
        if (isMounted) setEvidenceReport(nextReport);
      })
      .catch(() => {
        if (isMounted) setEvidenceReport(undefined);
      });

    return () => {
      isMounted = false;
    };
  }, [repository, selectedReportId]);

  if (!evidenceReport) {
    return (
      <RecruiterShell
        active="reports"
        title="Candidate Evidence Report"
        subtitle="The requested report is not available in this company workspace."
        primaryAction="Final decision"
        secondaryAction="Share report"
      >
        <main className="workspace-content">
          <WarningCard title="Human review required">
            Report access is scoped to the active company workspace. Return to the dashboard and open an available evidence report.
          </WarningCard>
        </main>
      </RecruiterShell>
    );
  }

  const candidateProfile: CandidateProfile = {
    name: evidenceReport.candidate.name,
    role: evidenceReport.jobRole.title,
    company: evidenceReport.company.name,
    appliedDate: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(evidenceReport.application.appliedAt)
    ),
    reportGenerated: evidenceReport.generatedAt,
    reportId: evidenceReport.reportId,
    currentStatus: evidenceReport.status,
    assignedRecruiter: "Sarah Tan",
    consentStatus: evidenceReport.application.consentId ? "Consent recorded" : "Consent missing",
    questionnaireStatus: "Completed",
    resumeLabel: evidenceReport.documentSources[0]?.fileName ?? "Resume not attached",
    statusBadges: [
      { label: "Evidence report ready", tone: "success" },
      { label: evidenceReport.status, tone: evidenceReport.status === "Evidence report ready" ? "success" : "info" },
      { label: "Decision pending", tone: "warning" }
    ]
  };

  return (
    <RecruiterShell
      active="reports"
      title="Candidate Evidence Report"
      subtitle="Review job-related evidence, missing proof, fairness checks, and human decision notes."
      primaryAction="Final decision"
      secondaryAction="Share report"
    >
      <main className="workspace-content">
        <CandidateHeader candidate={candidateProfile} />

        <section className="dashboard-metrics">
          {evidenceReport.evidenceSummary.map((card) => (
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
          <CandidateDetailPanel candidate={candidateProfile} fairness={evidenceReport.fairnessCheck} />
          <div className="report-main-column">
            <EvidenceMatrix rows={evidenceReport.requirementEvidence} />
            <ReportSupportSections
              missingEvidence={evidenceReport.missingEvidence}
              verificationNeeded={evidenceReport.verificationNeeded}
              interviewQuestions={evidenceReport.suggestedInterviewQuestions}
              recruiterNotes={evidenceReport.recruiterNotes}
              documentSources={evidenceReport.documentSources}
              auditTrailPreview={evidenceReport.auditTrailPreview}
            />
            <FairnessCheckCard fairness={evidenceReport.fairnessCheck} />
            <HumanDecisionPanel
              options={evidenceReport.humanDecision.options}
              onSaveDecision={(decision: ReviewDecision["decision"], reason: string) =>
                repository.saveHumanReviewDecision({
                  companyId: activeContext.companyId,
                  reportId: evidenceReport.id,
                  applicationId: evidenceReport.application.id,
                  userId: activeContext.userId,
                  decision,
                  reason,
                  timestamp: new Date().toISOString()
                })
              }
            />
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
