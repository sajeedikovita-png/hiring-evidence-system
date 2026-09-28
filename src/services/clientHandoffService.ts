import type { EvidenceReport } from "../types/hiring";

/** Explicit client-facing allowlist. Never spread a report into an export. */
export type ClientHandoffBranding = { displayName: string; logoUrl: string; accentColor: string; heading: string; footer: string };

export function createClientHandoff(report: EvidenceReport, options: { includeDecision?: boolean; preparedAt?: string; branding?: Partial<ClientHandoffBranding> } = {}) {
  const text = (value: string) => value.slice(0, 12000).replace(/(?:https?:\/\/|file:\/\/|blob:|data:)[^\s<>]+/gi, "[link omitted]").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email omitted]");
  const safeLogoUrl = (value: string | undefined) => { if (!value || value.length > 500) return ""; try { return new URL(value).protocol === "https:" ? value : ""; } catch { return ""; } };
  const decision = report.humanDecision.draft;
  const branding: ClientHandoffBranding = {
    displayName: text(options.branding?.displayName || report.company.name),
    logoUrl: safeLogoUrl(options.branding?.logoUrl),
    accentColor: /^#[0-9a-f]{6}$/i.test(options.branding?.accentColor ?? "") ? String(options.branding?.accentColor) : "#28543f",
    heading: text(options.branding?.heading || "Candidate evidence summary"),
    footer: text(options.branding?.footer || "AI assists. Human decides. Evidence explains.")
  };
  return {
    reportReference: text(report.reportId),
    companyName: text(report.company.name),
    candidateName: text(report.candidate.name),
    roleTitle: text(report.jobRole.title),
    preparedAt: options.preparedAt ?? new Date().toISOString(),
    reportGeneratedAt: report.generatedAt,
    status: "Human review required" as const,
    branding,
    criteria: report.requirementEvidence.map((item) => ({
      requirement: text(item.requirement),
      evidence: item.source === "Recruiter note" ? "Internal evidence omitted from this summary." : text(item.evidence),
      source: item.source === "Recruiter note" ? "Internal source omitted" : item.source,
      sourceReference: item.source === "Recruiter note" ? "Not included" : text(item.sourceReference || "Reference not recorded"),
      status: item.source === "Recruiter note" ? "Needs verification" : text(item.status.label),
      verification: item.source === "Recruiter note" ? "Ask the recruiter for approved supporting evidence." : text(item.verificationNeeded)
    })),
    missingEvidence: report.missingEvidence.map(text),
    verificationNeeded: report.verificationNeeded.map(text),
    questions: report.suggestedInterviewQuestions.map(text),
    decision: options.includeDecision && decision?.status === "saved" ? {
      outcome: decision.decision,
      reason: text(decision.reason),
      recordedAt: decision.createdAt
    } : undefined
  };
}

export type ClientHandoff = ReturnType<typeof createClientHandoff>;
