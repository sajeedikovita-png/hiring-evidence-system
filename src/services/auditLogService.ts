import type { AuditLogEntry } from "../types/hiring";
import { requireCompanyId } from "./companyContextService";

export type SafeAuditAction =
  | "dashboard_viewed"
  | "job_role_read"
  | "candidate_read"
  | "evidence_report_read"
  | "human_review_decision_saved"
  | "upload_validated";

const safeAuditActions: SafeAuditAction[] = [
  "dashboard_viewed",
  "job_role_read",
  "candidate_read",
  "evidence_report_read",
  "human_review_decision_saved",
  "upload_validated"
];

export type CreateAuditLogEntryInput = {
  companyId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: string;
};

export function isSafeAuditAction(action: string): action is SafeAuditAction {
  return safeAuditActions.includes(action as SafeAuditAction);
}

export function createAuditLogEntry(input: CreateAuditLogEntryInput): AuditLogEntry {
  const companyId = requireCompanyId(input.companyId);

  if (!input.userId.trim()) {
    throw new Error("userId is required");
  }

  if (!isSafeAuditAction(input.action)) {
    throw new Error("Unsupported audit action");
  }

  return {
    id: `audit-${input.action}-${input.entityId}-${input.timestamp}`,
    organizationId: companyId,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    createdAt: input.timestamp
  };
}
