export type OperationsCounts = {
  openIssues: number;
  notificationsPending: number;
  agentActive: number;
  blocked: number;
  released: number;
};

export type OperationsIssue = {
  issueId: string;
  reference: string;
  companyName: string;
  category: "question" | "bug" | "feature";
  severity: string;
  title: string;
  affectedPage: string;
  reviewStatus: string;
  triageStatus: string;
  notificationStatus: string;
  notificationSentAt?: string;
  notificationError?: string;
  agentStatus: string;
  riskLevel: string;
  automationScope: string;
  classification?: string;
  investigationSummary?: string;
  fixSummary?: string;
  testResults: Array<{ name?: string; status?: string; detail?: string }>;
  previewUrl?: string;
  releaseUrl?: string;
  blockedReason?: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  leaseExpiresAt?: string;
  baseCommit?: string;
  targetCommit?: string;
  changedFiles: string[];
  deploymentId?: string;
  previewVerifiedAt?: string;
};

export type OperationsEvent = { id: string; reference: string; eventType: string; status: string; summary: string; createdAt: string };
export type SupportOperationsReport = { generatedAt: string; counts: OperationsCounts; issues: OperationsIssue[]; events: OperationsEvent[] };

type RpcResult = { data: unknown; error: { message?: string } | null };
export type OperationsClient = { rpc: (name: string, args?: Record<string, never>) => PromiseLike<RpcResult> };

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function count(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }

export function mapSupportOperationsReport(value: unknown): SupportOperationsReport {
  const root = object(value);
  const counts = object(root.counts);
  const issues = Array.isArray(root.issues) ? root.issues.map((value) => {
    const issue = object(value);
    const category = text(issue.category, "question");
    return {
      issueId: text(issue.issueId), reference: text(issue.reference), companyName: text(issue.companyName, "Customer workspace"),
      category: category === "bug" || category === "feature" ? category : "question",
      severity: text(issue.severity, "low"), title: text(issue.title, "Support request"), affectedPage: text(issue.affectedPage, "workspace"),
      reviewStatus: text(issue.reviewStatus, "open"), triageStatus: text(issue.triageStatus, "not_requested"),
      notificationStatus: text(issue.notificationStatus, "not_queued"), notificationSentAt: text(issue.notificationSentAt) || undefined,
      notificationError: text(issue.notificationError) || undefined, agentStatus: text(issue.agentStatus, "not_queued"),
      riskLevel: text(issue.riskLevel, "unclassified"), automationScope: text(issue.automationScope, "prepare_only"),
      classification: text(issue.classification) || undefined, investigationSummary: text(issue.investigationSummary) || undefined,
      fixSummary: text(issue.fixSummary) || undefined, testResults: Array.isArray(issue.testResults) ? issue.testResults.map(object) : [],
      previewUrl: text(issue.previewUrl) || undefined, releaseUrl: text(issue.releaseUrl) || undefined,
      blockedReason: text(issue.blockedReason) || undefined, approvalStatus: text(issue.approvalStatus, "not_requested"),
      createdAt: text(issue.createdAt), updatedAt: text(issue.updatedAt), attemptCount: count(issue.attemptCount),
      leaseExpiresAt: text(issue.leaseExpiresAt) || undefined, baseCommit: text(issue.baseCommit) || undefined,
      targetCommit: text(issue.targetCommit) || undefined, changedFiles: Array.isArray(issue.changedFiles) ? issue.changedFiles.filter((value): value is string => typeof value === "string") : [],
      deploymentId: text(issue.deploymentId) || undefined, previewVerifiedAt: text(issue.previewVerifiedAt) || undefined
    } as OperationsIssue;
  }) : [];
  const events = Array.isArray(root.events) ? root.events.map((value) => { const event = object(value); return { id: text(event.id), reference: text(event.reference), eventType: text(event.eventType), status: text(event.status), summary: text(event.summary), createdAt: text(event.createdAt) }; }) : [];
  return {
    generatedAt: text(root.generatedAt, new Date().toISOString()),
    counts: { openIssues: count(counts.openIssues), notificationsPending: count(counts.notificationsPending), agentActive: count(counts.agentActive), blocked: count(counts.blocked), released: count(counts.released) },
    issues, events
  };
}

export async function getSupportOperationsReport(client: OperationsClient): Promise<SupportOperationsReport> {
  const result = await client.rpc("get_support_operations_report");
  if (result.error) throw new Error(result.error.message || "Operations report is unavailable.");
  return mapSupportOperationsReport(result.data);
}
