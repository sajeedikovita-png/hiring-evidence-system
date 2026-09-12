import {
  buildApprovalResponse,
  normalizeAccessRequestInput,
  parseApprovedRole,
  validateAccessRequestInput
} from "../_shared/access.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("normalizes public request input", () => {
  const input = normalizeAccessRequestInput({
    companyName: "  Northstar Digital ",
    workEmail: " SajeediKovita@GMAIL.COM ",
    requesterRole: " Founder ",
    hiringVolume: " 1-2 roles ",
    firstRoleToReview: " Frontend Developer ",
    note: " Test the evidence workflow. "
  });

  assert(input.companyName === "Northstar Digital", "company name should be trimmed");
  assert(input.workEmail === "sajeedikovita@gmail.com", "email should be normalized");
  assert(input.note === "Test the evidence workflow.", "note should be trimmed");
});

Deno.test("rejects incomplete public request input", () => {
  const result = validateAccessRequestInput(
    normalizeAccessRequestInput({
      companyName: "",
      workEmail: "not-an-email",
      requesterRole: "",
      hiringVolume: "",
      firstRoleToReview: ""
    })
  );

  assert(!result.valid, "incomplete input should be invalid");
  assert(result.errors.companyName === "Enter a company name.", "company error should be present");
  assert(result.errors.workEmail === "Enter a valid work email.", "email error should be present");
});

Deno.test("allows only supported recruiter roles", () => {
  assert(parseApprovedRole("recruiter") === "recruiter", "recruiter should be allowed");
  assert(parseApprovedRole("hiring_manager") === "hiring_manager", "hiring manager should be allowed");
  assert(parseApprovedRole("admin") === "admin", "admin should be allowed");
  assert(parseApprovedRole("owner") === undefined, "unknown roles should be rejected");
});

Deno.test("approval response contains no privileged credentials", () => {
  const result = buildApprovalResponse({
    requestId: "request-1",
    authUserId: "auth-user-1",
    status: "approved"
  });
  const serialized = JSON.stringify(result);

  assert(result.status === "approved", "approval status should be returned");
  assert(!serialized.includes("service_role"), "service role text must not be returned");
  assert(!serialized.includes("SUPABASE_SECRET_KEYS"), "secret key names must not be returned");
});
