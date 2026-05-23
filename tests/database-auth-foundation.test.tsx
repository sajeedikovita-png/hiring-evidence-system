import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { App } from "../src/App";
import { createAuditLogEntry, isSafeAuditAction } from "../src/services/auditLogService";
import { getDevAuthContext } from "../src/services/authService";
import { getActiveCompanyContext } from "../src/services/companyContextService";
import { containsForbiddenHiringLanguage } from "../src/services/compliance";
import { getDashboardData, getJobById, getReportById } from "../src/services/hiringRepository";
import { saveHumanReviewDecision } from "../src/services/reportService";
import { validateUploadFile } from "../src/services/uploadService";

const devAuth = getDevAuthContext();
const companyContext = getActiveCompanyContext();

assert.equal(devAuth.companyId, "org-northstar");
assert.equal(devAuth.userId, "user-sarah-tan");
assert.equal(devAuth.source, "dev-seed");
assert.equal(companyContext.companyId, devAuth.companyId);
assert.equal(companyContext.userId, devAuth.userId);

assert.throws(() => getDashboardData(""), /companyId is required/);
assert.throws(() => getJobById("", "job-frontend-developer"), /companyId is required/);

const dashboard = getDashboardData(companyContext.companyId);
assert.equal(dashboard.metrics.some((metric) => metric.label === "Active jobs"), true);

assert.equal(getJobById(companyContext.companyId, "job-frontend-developer")?.organizationId, companyContext.companyId);
assert.equal(getReportById(companyContext.companyId, "report-amanda-lee")?.id, "report-amanda-lee");
assert.equal(getReportById("org-other-company", "report-amanda-lee"), undefined);

const routeReportHtml = renderToStaticMarkup(<App path="/reports/report-amanda-lee" />);
assert.match(routeReportHtml, /Amanda Lee/);
assert.match(routeReportHtml, /HER-2026-0521-AL/);

const rejectedDecision = saveHumanReviewDecision({
  companyId: companyContext.companyId,
  reportId: "report-amanda-lee",
  applicationId: "application-amanda-frontend",
  userId: companyContext.userId,
  decision: "Hold for review",
  reason: "   ",
  timestamp: "2026-05-23T10:00:00.000Z"
});
assert.equal(rejectedDecision.valid, false);
assert.equal(rejectedDecision.message, "Decision reason required");

const savedDecision = saveHumanReviewDecision({
  companyId: companyContext.companyId,
  reportId: "report-amanda-lee",
  applicationId: "application-amanda-frontend",
  userId: companyContext.userId,
  decision: "Hold for review",
  reason: "Need to verify ownership of deployment work before recording a recruiter decision.",
  timestamp: "2026-05-23T10:05:00.000Z"
});
assert.equal(savedDecision.valid, true);
assert.equal(savedDecision.auditLogEntry?.action, "human_review_decision_saved");

assert.equal(isSafeAuditAction("human_review_decision_saved"), true);
assert.equal(isSafeAuditAction("ai_selected"), false);

const auditEntry = createAuditLogEntry({
  companyId: companyContext.companyId,
  userId: companyContext.userId,
  entityType: "evidence_report",
  entityId: "report-amanda-lee",
  action: "evidence_report_read",
  timestamp: "2026-05-23T10:06:00.000Z"
});
assert.equal(auditEntry.organizationId, companyContext.companyId);
assert.equal(auditEntry.action, "evidence_report_read");

assert.equal(validateUploadFile({ name: "resume.gif", size: 1000 }).message, "Unsupported file type");
assert.equal(containsForbiddenHiringLanguage(routeReportHtml), false);

console.log("Database and auth foundation tests passed.");
