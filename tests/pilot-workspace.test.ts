import assert from "node:assert/strict";

import { describeDemoWorkspace, type DemoWorkspaceRow } from "../src/services/demoWorkspaceAdminService";
import { containsForbiddenHiringLanguage } from "../src/services/compliance";
import {
  candidateNameFromFileName,
  getFileExtension,
  getPilotUploadErrorMessage,
  mapPilotUploadError,
  type PilotUploadErrorCode
} from "../src/services/pilotUploadService";

// --- Upload failures are reported honestly and in safe product language ---------

const errorCodes: PilotUploadErrorCode[] = [
  "UNSUPPORTED_FILE_TYPE",
  "FILE_TOO_LARGE",
  "PILOT_EXPIRED",
  "PILOT_CANDIDATE_LIMIT",
  "JOB_NOT_IN_WORKSPACE",
  "NO_JOB_CRITERIA",
  "UNREADABLE_FILE",
  "ANALYSIS_FAILED",
  "STORAGE_FAILED",
  "SAVE_FAILED"
];

for (const code of errorCodes) {
  const message = getPilotUploadErrorMessage(code);
  assert.ok(message.length > 0, `${code} must have a customer-facing message`);
  assert.equal(containsForbiddenHiringLanguage(message), false, `${code} message must use safe hiring language`);
}

// A view-only workspace explains that existing reports remain readable.
assert.match(getPilotUploadErrorMessage("PILOT_EXPIRED"), /view-only/i);

// Postgres raises bare codes; they must survive the round trip to the UI.
assert.equal(mapPilotUploadError('new row violates ... "PILOT_EXPIRED"'), "PILOT_EXPIRED");
assert.equal(mapPilotUploadError("PILOT_CANDIDATE_LIMIT"), "PILOT_CANDIDATE_LIMIT");
assert.equal(mapPilotUploadError("JOB_NOT_IN_WORKSPACE"), "JOB_NOT_IN_WORKSPACE");
assert.equal(mapPilotUploadError("connection reset by peer"), "SAVE_FAILED");
assert.equal(mapPilotUploadError("connection reset by peer", "ANALYSIS_FAILED"), "ANALYSIS_FAILED");

// --- File naming ---------------------------------------------------------------

assert.equal(candidateNameFromFileName("Amanda_Lee_Resume.pdf"), "Amanda Lee");
assert.equal(candidateNameFromFileName("priya-raman.docx"), "priya raman");
assert.equal(candidateNameFromFileName(".pdf"), "Candidate pending name detection");
assert.equal(getFileExtension("Amanda_Lee_Resume.PDF"), "pdf");
assert.equal(getFileExtension("noextension"), "");

// --- Administrator's view of each workspace ------------------------------------

function workspace(overrides: Partial<DemoWorkspaceRow>): DemoWorkspaceRow {
  return {
    companyId: "00000000-0000-0000-0000-000000000001",
    companyName: "Test Company",
    state: "active",
    activatedAt: null,
    activeUntil: null,
    purgeAt: null,
    convertedAt: null,
    candidateCount: 0,
    jobCount: 0,
    ...overrides
  };
}

const now = new Date("2026-07-31T09:00:00.000Z");
const activatedAt = "2026-07-25T09:00:00.000Z";

assert.match(describeDemoWorkspace(workspace({ activatedAt: null }), now), /start on their first dashboard visit/);
assert.match(describeDemoWorkspace(workspace({ activatedAt }), now), /8 days left/);
// Activated 12 Jul: the 14 days ended 26 Jul, deletion falls on 2 Aug.
assert.match(
  describeDemoWorkspace(workspace({ activatedAt: "2026-07-12T09:00:00.000Z" }), now),
  /View-only\. Scheduled for deletion in 2 days/
);
assert.match(
  describeDemoWorkspace(workspace({ activatedAt: "2026-06-01T09:00:00.000Z" }), now),
  /Past the view-only period/
);

// A continuing customer is never described with a countdown.
const converted = describeDemoWorkspace(workspace({ state: "converted", activatedAt, convertedAt: now.toISOString() }), now);
assert.match(converted, /not scheduled for deletion/i);
assert.doesNotMatch(converted, /day/i);

console.log("Pilot workspace tests passed.");
