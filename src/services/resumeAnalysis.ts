/**
 * Real résumé analysis pipeline (replaces the scripted demoUploadEngine output).
 *
 *   uploaded file -> extract text -> call the `analyze-resume` edge function
 *   (OpenRouter / Claude) -> build a real EvidenceReport.
 *
 * The report metadata (candidate, company, job, fairness, audit) is assembled by
 * the existing demo engine; only the evidence *content* is swapped for the real
 * model output. If extraction or the model call fails, we fall back to the
 * scripted preview so an upload always yields a viewable report.
 */
import { jobCriteria, jobs } from "../data/mockHiringData";
import type { EvidenceItem, EvidenceReport, StatusBadge, SummaryMetric } from "../types/hiring";
import { generateDemoEvidenceReport, saveDemoReport } from "./demoUploadEngine";
import { extractResumeText } from "./resumeTextExtraction";
import { createHiringSupabaseClient } from "./supabaseClient";
import { hasSupabaseConfig } from "./supabaseConfig";

type AnalysisPayload = {
  overallStatus: EvidenceReport["status"];
  evidenceSummary: SummaryMetric[];
  requirementEvidence: Array<{
    criteriaId: string;
    requirement: string;
    evidence: string;
    source: EvidenceItem["source"];
    confidence: EvidenceItem["confidence"];
    verificationNeeded: string;
    status: StatusBadge;
  }>;
  missingEvidence: string[];
  verificationNeeded: string[];
  suggestedInterviewQuestions: string[];
  recruiterNotes: string[];
};

type AnalyzeResponse = { ok?: boolean; model?: string; analysis?: AnalysisPayload; error?: string };

export type ResumeAnalysisResult = {
  report: EvidenceReport;
  source: "ai" | "scripted";
  model?: string;
  message?: string;
};

function candidateNameFromFileName(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]?Resume$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return base || "Uploaded candidate";
}

function buildReportFromAnalysis(fileName: string, jobId: string, analysis: AnalysisPayload): EvidenceReport {
  const base = generateDemoEvidenceReport(fileName, jobId);
  const reportId = base.reportId;

  const requirementEvidence: EvidenceItem[] = analysis.requirementEvidence.map((item, index) => ({
    id: `ai-ev-${reportId}-${index}`,
    reportId,
    applicationId: base.application.id,
    criteriaId: item.criteriaId,
    requirement: item.requirement,
    evidence: item.evidence,
    source: item.source,
    confidence: item.confidence,
    verificationNeeded: item.verificationNeeded,
    status: item.status
  }));

  return {
    ...base,
    status: analysis.overallStatus,
    generatedAt: "AI-analyzed just now (held for this session)",
    evidenceSummary: analysis.evidenceSummary.length > 0 ? analysis.evidenceSummary : base.evidenceSummary,
    requirementEvidence: requirementEvidence.length > 0 ? requirementEvidence : base.requirementEvidence,
    missingEvidence: analysis.missingEvidence,
    verificationNeeded: analysis.verificationNeeded,
    suggestedInterviewQuestions: analysis.suggestedInterviewQuestions,
    recruiterNotes: analysis.recruiterNotes
  };
}

export async function analyzeResumeFile(file: File, jobId: string): Promise<ResumeAnalysisResult> {
  const scriptedFallback = (message: string): ResumeAnalysisResult => {
    const report = generateDemoEvidenceReport(file.name, jobId);
    saveDemoReport(report);
    if (message) console.warn(`[resumeAnalysis] falling back to scripted preview: ${message}`);
    return { report, source: "scripted", message };
  };

  if (!hasSupabaseConfig()) {
    return scriptedFallback("Supabase is not configured for this session.");
  }

  let resumeText = "";
  try {
    resumeText = await extractResumeText(file);
  } catch (error) {
    return scriptedFallback(`could not read file text: ${error instanceof Error ? error.message : "extraction failed"}`);
  }
  if (resumeText.trim().length < 30) {
    return scriptedFallback("extracted résumé text was too short to analyze.");
  }

  const job = jobs.find((item) => item.id === jobId) ?? jobs[0];
  const criteria = jobCriteria
    .filter((item) => item.jobId === job.id)
    .map((item) => ({ id: item.id, label: item.label }));
  if (criteria.length === 0) {
    return scriptedFallback("no job criteria were found for this role.");
  }

  try {
    const client = createHiringSupabaseClient();
    const { data, error } = await client.functions.invoke<AnalyzeResponse>("analyze-resume", {
      body: {
        resumeText,
        candidateName: candidateNameFromFileName(file.name),
        job: { title: job.title, criteria }
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.ok || !data.analysis) throw new Error(data?.error ?? "analysis request failed");

    const report = buildReportFromAnalysis(file.name, jobId, data.analysis);
    saveDemoReport(report);
    return { report, source: "ai", model: data.model };
  } catch (error) {
    return scriptedFallback(`AI analysis failed: ${error instanceof Error ? error.message : "request failed"}`);
  }
}
