export type SupportIssueType = "problem" | "feature";
export type SupportSeverity = "low" | "medium" | "high" | "critical";
export type SupportStatus = "open" | "reviewed" | "closed" | "escalated";
export type SupportTriageStatus = "not_requested" | "processing" | "draft" | "escalated";
export type SupportApprovalStatus = "not_requested" | "pending_approval" | "approved" | "rejected";

export type SupportIssue = {
  id: string;
  companyName: string;
  summary: string;
  details: string;
  type: SupportIssueType;
  severity: SupportSeverity;
  affectedPage: string;
  status: SupportStatus;
  triageStatus: SupportTriageStatus;
  approvalStatus: SupportApprovalStatus;
  approvalExpiresAt?: string;
  aiRecommendation: string;
  createdAt: string;
};

export type SafeDiagnosticsPreview = { page: string; pageTitle: string; workspaceRole?: string; repositorySource: string };
export type SupportGuidePresentation = {
  steps?: Array<{ title: string; detail: string }>;
  example?: string;
  action?: { label: string; href: string };
};
export type SupportIssueInput = { summary: string; details: string; type: SupportIssueType; severity: SupportSeverity; affectedPage: string };
type SupportResult = { data: unknown; error: { message?: string } | null };
export type SupportClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<SupportResult>;
  functions: { invoke: (name: string, options: { body: Record<string, unknown> }) => PromiseLike<SupportResult> };
};
export type SupportRepository = {
  askQuestion: (input: { message: string; pageTitle: string; pagePath?: string; conversationId?: string }) => Promise<{ conversationId: string; answer: string; escalated: boolean; presentation?: SupportGuidePresentation }>;
  createIssue: (input: SupportIssueInput) => Promise<{ issueId: string }>;
  listInbox: () => Promise<SupportIssue[]>;
  triageIssue: (issueId: string) => Promise<void>;
  prepareChangeRequest: (issueId: string, summary: string) => Promise<{ requestId: string }>;
  approveChangeRequest: (input: { requestId: string; risk: "low" | "medium" | "high"; scope: string; testPlan: string; expiryHours?: number }) => Promise<void>;
  closeIssue: (issueId: string, note: string) => Promise<void>;
};

const pageHelp: Record<string, { title: string; tips: string[] }> = {
  dashboard: { title: "Your review workspace", tips: ["Use the queue to open reports that need human review.", "Evidence summaries are prompts for verification; record a reason for every decision."] },
  candidates: { title: "Jobs and candidates", tips: ["Create one role with specific, observable requirements before uploading candidate documents.", "Missing evidence should be verified before a decision is recorded."] },
  privacy: { title: "Privacy and data", tips: ["Submit a request for a specific candidate and describe what you need.", "A recorded request starts a human review process; it does not itself export or erase data."] },
  pilot: { title: "Pilot access", tips: ["Review the current access term and account rules here.", "Contact support if the access details do not match your agreement."] },
  reports: { title: "Evidence reports", tips: ["Read the evidence and verification notes together.", "The hiring team remains responsible for the final decision."] },
  support: { title: "Support", tips: ["Describe one issue or request at a time so it can be reviewed clearly.", "Do not include candidate names, documents, passwords, tokens, or confidential records."] }
};

export function getPageHelp(active: string) {
  return pageHelp[active] ?? { title: "Hiring Evidence workspace", tips: ["Use Help to ask a product question or report a problem.", "Support guidance does not change workspace records."] };
}

export function buildSafeDiagnosticsPreview(input: { pathname: string; pageTitle: string; repositorySource: string; workspaceRole?: string }): SafeDiagnosticsPreview {
  return { page: input.pathname.split("?")[0], pageTitle: input.pageTitle, repositorySource: input.repositorySource, ...(input.workspaceRole ? { workspaceRole: input.workspaceRole } : {}) };
}

export function validateSupportIssue(input: SupportIssueInput): string | undefined {
  if (!input.summary.trim()) return "Add a short summary.";
  if (!input.details.trim()) return "Add a few details so the team can investigate.";
  if (!input.affectedPage.trim()) return "Affected page is required.";
  if (input.summary.trim().length > 180 || input.details.trim().length > 4000) return "Keep the summary under 180 characters and the details under 4,000 characters.";
  return undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requiredData(result: SupportResult, message: string): Record<string, unknown> {
  if (result.error) throw new Error(result.error.message || message);
  const data = record(result.data);
  if (!Object.keys(data).length) throw new Error(message);
  return data;
}

function mapGuidePresentation(value: unknown): SupportGuidePresentation | undefined {
  const source = record(value);
  const steps = Array.isArray(source.steps) ? source.steps.map((value) => record(value)).map((step) => ({ title: String(step.title ?? "").trim(), detail: String(step.detail ?? "").trim() })).filter((step) => step.title && step.detail).slice(0, 4) : [];
  const example = typeof source.example === "string" ? source.example.trim() : "";
  const actionSource = record(source.action);
  const actionLabel = typeof actionSource.label === "string" ? actionSource.label.trim() : "";
  const actionHref = typeof actionSource.href === "string" ? actionSource.href.trim() : "";
  const action = actionLabel && /^\/(dashboard|jobs(?:\/[^?#]*)?|pilot-access|workspace\/(privacy|support)|reports\/[^?#]+)$/.test(actionHref) ? { label: actionLabel.slice(0, 60), href: actionHref } : undefined;
  if (!steps.length && !example && !action) return undefined;
  return { ...(steps.length ? { steps } : {}), ...(example ? { example: example.slice(0, 500) } : {}), ...(action ? { action } : {}) };
}

function mapIssue(value: unknown): SupportIssue {
  const item = record(value);
  const diagnostics = record(item.diagnostics);
  const category = String(item.category ?? item.reported_category ?? "bug");
  const severity = String(item.severity ?? diagnostics.severity ?? "low");
  const status = String(item.review_status ?? "open");
  const triageStatus = String(item.triage_status ?? "not_requested");
  const approvalStatus = String(item.approval_status ?? "not_requested");
  return {
    id: String(item.issue_id ?? item.id ?? ""),
    companyName: String(item.company_name ?? "Customer workspace"),
    summary: String(item.title ?? "Support request"),
    details: String(item.description ?? ""),
    type: category === "feature" ? "feature" : "problem",
    severity: severity === "critical" || severity === "high" || severity === "medium" ? severity : "low",
    affectedPage: String(item.affected_page ?? diagnostics.affected_page ?? "workspace"),
    status: status === "reviewed" || status === "closed" || status === "escalated" ? status : "open",
    triageStatus: triageStatus === "processing" || triageStatus === "draft" || triageStatus === "escalated" ? triageStatus : "not_requested",
    approvalStatus: approvalStatus === "pending_approval" || approvalStatus === "approved" || approvalStatus === "rejected" ? approvalStatus : "not_requested",
    approvalExpiresAt: item.approval_expires_at ? String(item.approval_expires_at) : undefined,
    aiRecommendation: String(item.developer_recommendation ?? "Run controlled AI triage to prepare an advisory recommendation."),
    createdAt: String(item.created_at ?? new Date().toISOString())
  };
}

export function createSupportRepository(client: SupportClient): SupportRepository {
  return {
    async askQuestion(input) {
      const message = input.message.trim();
      if (!message || message.length > 2000) throw new Error("Enter a question of up to 2,000 characters.");
      const pageTitle = input.pageTitle.trim().slice(0, 120) || "Hiring Evidence workspace";
      const pagePath = (input.pagePath ?? "").split("?")[0].slice(0, 240);
      const contextualMessage = `Current page: ${pageTitle}${pagePath ? ` (${pagePath})` : ""}\nCustomer question: ${message}`;
      let conversationId = input.conversationId ?? "";
      let messageId = "";
      if (conversationId) {
        const data = requiredData(await client.rpc("create_support_message", { p_conversation_id: conversationId, p_message: contextualMessage }), "The support message could not be recorded.");
        messageId = String(data.message_id ?? "");
      } else {
        const data = requiredData(await client.rpc("create_support_conversation", { p_subject: `Help with ${pageTitle}`.slice(0, 160), p_message: contextualMessage }), "The support conversation could not be started.");
        conversationId = String(data.conversation_id ?? "");
        messageId = String(data.message_id ?? "");
      }
      if (!conversationId || !messageId) throw new Error("The support conversation response was incomplete.");
      const assistant = requiredData(await client.functions.invoke("support-assistant", { body: { conversationId, messageId } }), "The support assistant is unavailable.");
      return {
        conversationId,
        answer: String(assistant.message ?? "I do not have approved guidance for this request. Please report it for human support review."),
        escalated: String(assistant.status) === "escalated",
        presentation: mapGuidePresentation(assistant.presentation)
      };
    },
    async createIssue(input) {
      const error = validateSupportIssue(input);
      if (error) throw new Error(error);
      const data = requiredData(await client.functions.invoke("submit-support-issue", { body: { type: input.type, severity: input.severity, title: input.summary.trim(), description: input.details.trim(), diagnostics: { affected_page: input.affectedPage } } }), "The support request could not be recorded.");
      const issueId = String(data.issueId ?? "");
      if (!issueId) throw new Error("The support request response was incomplete.");
      return { issueId };
    },
    async listInbox() {
      const result = await client.rpc("list_support_inbox");
      if (result.error) throw new Error(result.error.message || "The support inbox could not be loaded.");
      return Array.isArray(result.data) ? result.data.map(mapIssue) : [];
    },
    async triageIssue(issueId) {
      if (!issueId) throw new Error("A support issue is required.");
      requiredData(await client.functions.invoke("support-triage", { body: { issueId } }), "AI triage could not be completed.");
    },
    async prepareChangeRequest(issueId, summary) {
      if (!issueId || !summary.trim()) throw new Error("A proposed work summary is required.");
      const data = requiredData(await client.rpc("prepare_platform_change_request", { p_issue_id: issueId, p_request_summary: summary.trim() }), "The developer work order could not be prepared.");
      const requestId = String(data.id ?? "");
      if (!requestId) throw new Error("The developer work order response was incomplete.");
      return { requestId };
    },
    async approveChangeRequest(input) {
      requiredData(await client.rpc("approve_developer_change_request", { p_request_id: input.requestId, p_risk_level: input.risk, p_affected_scope: input.scope.trim(), p_test_plan: input.testPlan.trim(), p_expiry_hours: input.expiryHours ?? 72 }), "The developer work order could not be approved.");
    },
    async closeIssue(issueId, note) {
      if (!note.trim()) throw new Error("A written review note is required.");
      requiredData(await client.rpc("review_support_issue", { p_issue_id: issueId, p_decision: "close", p_note: note.trim() }), "The support issue could not be closed.");
    }
  };
}
