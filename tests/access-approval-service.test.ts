import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  approveAccessRequest,
  grantSpecialCompanyAccess,
  rejectAccessRequest
} from "../src/services/accessApprovalService";
import {
  submitPilotRequest,
  type PilotRequestInput
} from "../src/services/pilotRequestService";

type InvokeResult = {
  data: unknown;
  error: { message?: string } | null;
};

function createFunctionsClient(result: InvokeResult) {
  const calls: Array<{ name: string; options: unknown }> = [];

  return {
    calls,
    client: {
      functions: {
        async invoke(name: string, options: unknown) {
          calls.push({ name, options });
          return result;
        }
      }
    }
  };
}

const validRequest: PilotRequestInput = {
  companyName: " Northstar Digital ",
  workEmail: " SajeediKovita@GMAIL.COM ",
  requesterRole: " Founder ",
  hiringVolume: "1-2 roles this quarter",
  firstRoleToReview: " Frontend Developer ",
  note: " Test the evidence workflow. "
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function run() {
const requestClient = createFunctionsClient({
  data: { status: "request_received" },
  error: null
});
const submitted = await submitPilotRequest(validRequest, requestClient.client);

assert.equal(submitted.status, "pending_contact");
assert.deepEqual(requestClient.calls, [
  {
    name: "request-access",
    options: {
      body: {
        companyName: "Northstar Digital",
        workEmail: "sajeedikovita@gmail.com",
        requesterRole: "Founder",
        hiringVolume: "1-2 roles this quarter",
        firstRoleToReview: "Frontend Developer",
        note: "Test the evidence workflow."
      }
    }
  }
]);

const specialAccessClient = createFunctionsClient({
  data: { status: "active", companyId: "pilot-company-1", invitationPrepared: false, transferred: true },
  error: null
});
const specialAccess = await grantSpecialCompanyAccess({
  email: " Person@Example.com ",
  companyId: "pilot-company-1",
  role: "recruiter",
  reason: "Approved company transfer after owner verification.",
  transferExisting: true
}, specialAccessClient.client);
assert.equal(specialAccess.transferred, true);
assert.deepEqual(specialAccessClient.calls[0], {
  name: "special-company-access",
  options: { body: {
    email: "person@example.com",
    companyId: "pilot-company-1",
    role: "recruiter",
    reason: "Approved company transfer after owner verification.",
    transferExisting: true
  } }
});

const approvalClient = createFunctionsClient({
  data: {
    requestId: "request-1",
    authUserId: "auth-user-1",
    companyId: "pilot-company-1",
    status: "approved"
  },
  error: null
});
const approved = await approveAccessRequest(
  {
    requestId: "request-1"
  },
  approvalClient.client
);

assert.equal(approved.status, "approved");
assert.equal(approved.companyId, "pilot-company-1");
assert.deepEqual(approvalClient.calls, [
  {
    name: "approve-access-request",
    options: {
      body: {
        requestId: "request-1"
      }
    }
  }
]);

const rejectionClient = createFunctionsClient({
  data: { requestId: "request-1", status: "rejected" },
  error: null
});
const rejected = await rejectAccessRequest(
  {
    requestId: "request-1",
    reviewNote: "Not ready for this pilot."
  },
  rejectionClient.client
);

assert.equal(rejected.status, "rejected");
assert.equal(rejectionClient.calls[0]?.name, "reject-access-request");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pilotServiceSource = fs.readFileSync(
  path.join(repoRoot, "src/services/pilotRequestService.ts"),
  "utf8"
);
const browserSource = fs
  .readdirSync(path.join(repoRoot, "src/services"))
  .filter((file) => file.endsWith(".ts"))
  .map((file) =>
    fs.readFileSync(path.join(repoRoot, "src/services", file), "utf8")
  )
  .join("\n");

assert.doesNotMatch(pilotServiceSource, /localStorage|sessionStorage/);
assert.doesNotMatch(
  browserSource,
  /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|service_role/
);

const approvalFunctionSource = fs.readFileSync(
  path.join(repoRoot, "supabase/functions/approve-access-request/index.ts"),
  "utf8"
);
const approvalHelperSource = fs.readFileSync(
  path.join(repoRoot, "supabase/functions/_shared/approval.ts"),
  "utf8"
);
const inviteFunctionSource = fs.readFileSync(
  path.join(repoRoot, "supabase/functions/invite-user/index.ts"),
  "utf8"
);
const functionsConfig = fs.readFileSync(path.join(repoRoot, "supabase/config.toml"), "utf8");
const adminAccessPageSource = fs.readFileSync(
  path.join(repoRoot, "src/pages/AdminAccessRequestsPage.tsx"),
  "utf8"
);

assert.match(approvalFunctionSource, /rpc\("provision_demo_workspace"/);
assert.match(approvalFunctionSource, /provisioned_company_id/);
assert.match(approvalFunctionSource, /rpc\("finalize_access_request_approval"/);
assert.match(approvalFunctionSource, /\.ilike\("email", normalizedEmail\)/);
assert.match(approvalFunctionSource, /findAuthUserByNormalizedEmail/);
assert.match(approvalFunctionSource, /getValidatedInvitationRedirectUrl/);
assert.match(approvalFunctionSource, /already has active company access/);
assert.doesNotMatch(approvalFunctionSource, /http:\/\/localhost:3000/);
assert.doesNotMatch(approvalFunctionSource, /from\("audit_log_entries"/);
assert.doesNotMatch(approvalFunctionSource, /parseApprovedRole|companyId\?: unknown/);
assert.match(approvalHelperSource, /MAX_AUTH_USER_PAGES = 100/);
assert.match(approvalHelperSource, /new URL\("\/set-password", appUrl\.origin\)/);
assert.match(inviteFunctionSource, /authorizeAdmin\(request, adminClient\)/);
assert.doesNotMatch(inviteFunctionSource, /error\.message/);
assert.match(inviteFunctionSource, /Deno\.env\.get\("APP_URL"\)/);
assert.match(inviteFunctionSource, /new URL\("\/set-password", appUrl\.origin\)/);
assert.match(inviteFunctionSource, /Invitation redirect is not configured/);
assert.doesNotMatch(inviteFunctionSource, /hiring-evidence-system\.vercel\.app/);
assert.match(functionsConfig, /\[functions\.invite-user\]\s+verify_jwt = true/);
assert.match(adminAccessPageSource, /separate pilot workspace/);
assert.match(adminAccessPageSource, /Create pilot workspace/);
assert.match(adminAccessPageSource, /Special company access/);
assert.match(adminAccessPageSource, /Required reason/);

console.log("Access approval service tests passed.");
}
