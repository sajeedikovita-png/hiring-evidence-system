import assert from "node:assert/strict";

import {
  getAccessRequestFailureMessage,
  saveAccessRequestToBackend,
  type AccessRequestInput
} from "../src/services/accessRequestService";
import { containsForbiddenHiringLanguage } from "../src/services/compliance";
import {
  emptyJobSetupInput,
  getFilledCriteria,
  getJobSetupErrorMessage,
  validateJobSetup,
  MAX_JOB_CRITERIA,
  type JobSetupInput
} from "../src/services/jobSetupService";

// --- First-role onboarding validation ------------------------------------------

function jobInput(overrides: Partial<JobSetupInput> = {}): JobSetupInput {
  return {
    title: "Frontend Developer",
    department: "Engineering",
    location: "Singapore",
    employmentType: "Full time",
    criteria: [{ label: "React in production", description: "Has shipped React at work.", priority: "required" }],
    ...overrides
  };
}

assert.equal(validateJobSetup(jobInput()).valid, true);

// A role with no title has nothing to review against.
const noTitle = validateJobSetup(jobInput({ title: "   " }));
assert.equal(noTitle.valid, false);
assert.ok(noTitle.errors.title);

// Criteria ARE the product — a role without them produces an empty evidence matrix.
const noCriteria = validateJobSetup(jobInput({ criteria: [] }));
assert.equal(noCriteria.valid, false);
assert.match(String(noCriteria.errors.criteria), /at least one criterion/i);

// Blank rows from the starter form are dropped, not treated as criteria.
const blankRows = emptyJobSetupInput();
assert.equal(getFilledCriteria(blankRows.criteria).length, 0);
assert.equal(validateJobSetup({ ...blankRows, title: "Analyst" }).valid, false);

// Preferred-only means nothing is actually required of a candidate.
const preferredOnly = validateJobSetup(
  jobInput({ criteria: [{ label: "Nice to have", description: "", priority: "preferred" }] })
);
assert.equal(preferredOnly.valid, false);
assert.match(String(preferredOnly.errors.criteria), /required/i);

// The cap matches the analyzer's own limit, so a role cannot be created that the
// evidence analysis would silently truncate.
const tooMany = validateJobSetup(
  jobInput({
    criteria: Array.from({ length: MAX_JOB_CRITERIA + 1 }, (_, index) => ({
      label: `Criterion ${index + 1}`,
      description: "",
      priority: "required" as const
    }))
  })
);
assert.equal(tooMany.valid, false);

// Database codes become something a recruiter can act on, in safe language.
for (const raw of [
  "PILOT_JOB_LIMIT",
  "PILOT_EXPIRED",
  "TOO_MANY_CRITERIA",
  "REQUIRED_CRITERION_MISSING",
  "CRITERIA_REQUIRED",
  "TITLE_REQUIRED",
  "AMBIGUOUS_WORKSPACE",
  "NO_WORKSPACE",
  "some unexpected postgres error"
]) {
  const message = getJobSetupErrorMessage(raw);
  assert.ok(message.length > 0, `${raw} must map to a message`);
  assert.doesNotMatch(message, /PILOT_|_REQUIRED|WORKSPACE'/, `${raw} must not leak a raw code: ${message}`);
  assert.equal(containsForbiddenHiringLanguage(message), false, `${raw} message must use safe hiring language`);
}

assert.match(getJobSetupErrorMessage("PILOT_JOB_LIMIT"), /role limit/i);

// --- Public request intake: success only on a confirmed save --------------------

const request: AccessRequestInput = {
  companyName: "ACME Recruiting",
  workEmail: "owner@acme.example",
  requesterRole: "Head of Talent",
  hiringVolume: "3-5 roles this quarter",
  firstRoleToReview: "Frontend Developer",
  note: ""
};

const config = { url: "https://project.supabase.co", anonKey: "anon-key" };

async function runIntakeChecks() {
  // Backend reachable and accepting -> success.
  const accepted = await saveAccessRequestToBackend(request, {
    config,
    fetchFn: (async () => new Response(null, { status: 201 })) as unknown as typeof fetch
  });
  assert.equal(accepted.ok, true);

  // Backend rejects -> NOT success. This is the bug this test exists for: the page
  // used to show "recorded" no matter what the backend said.
  const rejected = await saveAccessRequestToBackend(request, {
    config,
    fetchFn: (async () => new Response(null, { status: 401 })) as unknown as typeof fetch
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.message, "request_failed_401");

  // Server error -> not success.
  const serverError = await saveAccessRequestToBackend(request, {
    config,
    fetchFn: (async () => new Response(null, { status: 500 })) as unknown as typeof fetch
  });
  assert.equal(serverError.ok, false);

  // Network failure -> not success.
  const offline = await saveAccessRequestToBackend(request, {
    config,
    fetchFn: (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch
  });
  assert.equal(offline.ok, false);

  // No backend configured -> not success, and never silently "recorded".
  const unconfigured = await saveAccessRequestToBackend(request, { config: undefined, fetchFn: undefined });
  assert.equal(unconfigured.ok, false);
  assert.equal(unconfigured.message, "backend_not_configured");

  // The visitor is told the truth, and told their details are preserved.
  for (const message of ["backend_not_configured", "request_failed_401", "request_failed_500", undefined]) {
    const copy = getAccessRequestFailureMessage(message);
    assert.ok(copy.length > 0);
    assert.doesNotMatch(copy, /recorded|received|submitted successfully/i, `failure copy must not imply success: ${copy}`);
  }
  assert.match(getAccessRequestFailureMessage(undefined), /still here|try again/i);
}

runIntakeChecks().then(() => {
  console.log("Onboarding and intake tests passed.");
});
