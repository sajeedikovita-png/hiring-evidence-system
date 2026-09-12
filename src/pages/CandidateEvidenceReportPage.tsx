import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { WarningCard } from "../../components/ui/WarningCard";
import { DevelopmentConnectionStatusPanel } from "../components/dev/DevelopmentConnectionStatusPanel";
import { CandidateDetailPanel } from "../components/report/CandidateDetailPanel";
import { CandidateHeader } from "../components/report/CandidateHeader";
import { EvidenceMatrix } from "../components/report/EvidenceMatrix";
import { FairnessCheckCard } from "../components/report/FairnessCheckCard";
import { HumanDecisionPanel } from "../components/report/HumanDecisionPanel";
import { ReportSupportSections } from "../components/report/ReportSupportSections";
import { RecruiterShell } from "../components/layout/RecruiterShell";
import type { CompanyContext } from "../services/companyContextService";
import {
  classifyConnectionIssue,
  getDevelopmentConnectionStatus,
  type DevelopmentConnectionStatus
} from "../services/connectionStatusService";
import { getAsyncHiringRepository, getPublicSyntheticSampleReport } from "../services/hiringRepository";
import { getPrivateDocumentSourceUrl } from "../services/manualEvidenceReviewService";
import { createHiringSupabaseClient } from "../services/supabaseClient";
import type { CandidateProfile, EvidenceReport, ReviewDecision } from "../types/hiring";

type CandidateEvidenceReportPageProps = {
  syntheticSample?: boolean;
};

export function CandidateEvidenceReportPage({ syntheticSample = false }: CandidateEvidenceReportPageProps) {
  const { reportId } = useParams();
  const repository = useMemo(() => (syntheticSample ? undefined : getAsyncHiringRepository()), [syntheticSample]);
  const [activeContext, setActiveContext] = useState<CompanyContext | undefined>();
  const selectedReportId = reportId ?? "report-amanda-lee";
  const [evidenceReport, setEvidenceReport] = useState<EvidenceReport | undefined>(() =>
    syntheticSample ? getPublicSyntheticSampleReport() : undefined
  );
  const [connectionStatus, setConnectionStatus] = useState<DevelopmentConnectionStatus>(() =>
    getDevelopmentConnectionStatus({ repositorySource: repository?.source ?? "seed" })
  );
  const [reportLoadMessage, setReportLoadMessage] = useState("Report cannot load");
  const [sourceUrl, setSourceUrl] = useState<string | undefined>();

  useEffect(() => {
    if (syntheticSample || !repository) return;
    let isMounted = true;

    repository
      .getActiveCompanyContext()
      .then((context) => {
        if (isMounted) setActiveContext(context);
        return repository.getReportById(context.companyId, selectedReportId);
      })
      .then((nextReport) => {
        if (!isMounted) return;

        setEvidenceReport(nextReport);
        if (nextReport && repository.source === "supabase") {
          setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue: "ready" }));
        }
        if (!nextReport) {
          setReportLoadMessage("Report cannot load");
          setConnectionStatus(
            getDevelopmentConnectionStatus({
              repositorySource: repository.source,
              issue: "report_read_failed",
              error: "Report is not available in this company workspace."
            })
          );
        }
      })
      .catch((error) => {
        if (isMounted) {
          const issue = classifyConnectionIssue(error, "report_read_failed");
          setEvidenceReport(undefined);
          setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: repository.source, issue, error }));
          setReportLoadMessage(
            issue === "auth_user_missing"
              ? "Auth user missing"
              : issue === "company_context_missing"
                ? "Company context missing"
                : "Report cannot load"
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repository, selectedReportId, syntheticSample]);

  useEffect(() => {
    const documentId = syntheticSample ? undefined : evidenceReport?.documentSources[0]?.id;
    if (!documentId) {
      setSourceUrl(undefined);
      return;
    }
    let isMounted = true;
    void getPrivateDocumentSourceUrl(createHiringSupabaseClient(), documentId)
      .then((url) => { if (isMounted) setSourceUrl(url); })
      .catch(() => { if (isMounted) setSourceUrl(undefined); });
    return () => { isMounted = false; };
  }, [evidenceReport?.documentSources, syntheticSample]);

  if (!evidenceReport) {
    return (
      <RecruiterShell
        active="reports"
        title="Candidate Evidence Report"
        subtitle="The requested report is not available in this company workspace."
        reviewerName={activeContext?.userName ?? (syntheticSample ? "Synthetic sample" : "Recruiter")}
        showSignOut={!syntheticSample}
        publicSample={syntheticSample}
      >
        <main className="workspace-content">
          {syntheticSample ? null : <DevelopmentConnectionStatusPanel status={connectionStatus} />}
          {syntheticSample ? <WarningCard title="Synthetic sample">This public sample uses generated demonstration data. Decision saving is unavailable.</WarningCard> : null}
          <WarningCard title="Human review required">
            {reportLoadMessage}. Report access is scoped to the active company workspace. Return to the dashboard and open an available
            evidence report.
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
    assignedRecruiter: syntheticSample ? "Synthetic sample" : "Not recorded",
    consentStatus: evidenceReport.application.consentId ? "Consent recorded" : "Consent missing",
    questionnaireStatus: syntheticSample ? "Synthetic sample" : "Not recorded",
    resumeLabel: evidenceReport.documentSources[0]?.fileName ?? "Resume not attached",
    statusBadges: [
      { label: evidenceReport.status, tone: evidenceReport.status === "Evidence report ready" ? "success" : "info" },
      { label: "Decision pending", tone: "warning" }
    ]
  };

  return (
    <RecruiterShell
      active="reports"
      title="Candidate Evidence Report"
      subtitle="Review job-related evidence, missing proof, fairness checks, and human decision notes."
      reviewerName={activeContext?.userName ?? (syntheticSample ? "Synthetic sample" : "Recruiter")}
      showSignOut={!syntheticSample}
      publicSample={syntheticSample}
    >
      <main className="workspace-content">
        {syntheticSample ? null : <DevelopmentConnectionStatusPanel status={connectionStatus} />}
        {syntheticSample ? <WarningCard title="Synthetic sample">This public sample uses generated demonstration data. Decision saving is unavailable.</WarningCard> : null}
        <CandidateHeader candidate={candidateProfile} />

        <section className="dashboard-metrics">
          {evidenceReport.evidenceSummary.map((card) => (
            <Card key={card.label} title={card.label} meta={card.tone ? undefined : "Not recorded"}>
              <div className="summary-card-heading">
                <p className="metric">{card.value}</p>
                {card.tone ? <Badge tone={card.tone}>{card.label}</Badge> : null}
              </div>
              <p className="muted">{card.detail}</p>
            </Card>
          ))}
        </section>

        <WarningCard title="Evidence review required before making any hiring decision.">
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
              sourceUrl={sourceUrl}
              auditTrailPreview={evidenceReport.auditTrailPreview}
            />
            <FairnessCheckCard fairness={evidenceReport.fairnessCheck} />
            <HumanDecisionPanel
              options={evidenceReport.humanDecision.options}
              latestDecision={evidenceReport.humanDecision.draft}
              readOnly={syntheticSample}
              readOnlyMessage={syntheticSample ? "This synthetic sample is read-only. Decision saving is unavailable." : undefined}
              onSaveDecision={syntheticSample ? undefined : async (decision: ReviewDecision["decision"], reason: string) => {
                const liveRepository = repository;
                if (!liveRepository || !activeContext) return { valid: false, message: "Decision save failed" };
                try {
                  const result = await liveRepository.saveHumanReviewDecision({
                    companyId: activeContext.companyId,
                    reportId: evidenceReport.id,
                    applicationId: evidenceReport.application.id,
                    userId: activeContext.userId,
                    decision,
                    reason,
                    timestamp: new Date().toISOString()
                  });

                  if (result.valid && liveRepository.source === "supabase") {
                    setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: liveRepository.source, issue: "ready" }));
                  }

                  if (!result.valid) {
                    setConnectionStatus(
                      getDevelopmentConnectionStatus({
                        repositorySource: liveRepository.source,
                        issue: "decision_save_failed",
                        error: result.message
                      })
                    );
                  }

                  return result;
                } catch (error) {
                  setConnectionStatus(getDevelopmentConnectionStatus({ repositorySource: liveRepository.source, issue: "decision_save_failed", error }));
                  return { valid: false, message: "Decision save failed" };
                }
              }}
            />
          </div>
        </div>
      </main>
    </RecruiterShell>
  );
}
