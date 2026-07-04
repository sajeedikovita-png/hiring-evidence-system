import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  approveAccessRequest,
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
  data: { requestId: "request-1", status: "pending" },
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

const approvalClient = createFunctionsClient({
  data: {
    requestId: "request-1",
    authUserId: "auth-user-1",
    status: "approved"
  },
  error: null
});
const approved = await approveAccessRequest(
  {
    requestId: "request-1",
    companyId: "company-1",
    role: "recruiter"
  },
  approvalClient.client
);

assert.equal(approved.status, "approved");
assert.deepEqual(approvalClient.calls, [
  {
    name: "approve-access-request",
    options: {
      body: {
        requestId: "request-1",
        companyId: "company-1",
        role: "recruiter"
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

console.log("Access approval service tests passed.");
}
