export type AccessRequestInput = {
  companyName: string;
  workEmail: string;
  requesterRole: string;
  hiringVolume: string;
  firstRoleToReview: string;
  note: string;
};

export type AccessRequestErrors = Partial<Record<keyof AccessRequestInput, string>>;

export type ApprovedRole = "admin" | "recruiter" | "hiring_manager";

type ApprovalResponseInput = {
  requestId: string;
  authUserId: string;
  status: "approved";
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeAccessRequestInput(value: unknown): AccessRequestInput {
  const input = asRecord(value);

  return {
    companyName: asTrimmedString(input.companyName),
    workEmail: asTrimmedString(input.workEmail).toLowerCase(),
    requesterRole: asTrimmedString(input.requesterRole),
    hiringVolume: asTrimmedString(input.hiringVolume),
    firstRoleToReview: asTrimmedString(input.firstRoleToReview),
    note: asTrimmedString(input.note)
  };
}

export function validateAccessRequestInput(input: AccessRequestInput): {
  valid: boolean;
  errors: AccessRequestErrors;
} {
  const errors: AccessRequestErrors = {};

  if (!input.companyName) errors.companyName = "Enter a company name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.workEmail)) {
    errors.workEmail = "Enter a valid work email.";
  }
  if (!input.requesterRole) errors.requesterRole = "Enter your role.";
  if (!input.hiringVolume) errors.hiringVolume = "Choose the hiring volume.";
  if (!input.firstRoleToReview) {
    errors.firstRoleToReview = "Enter the first role to review.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function parseApprovedRole(value: unknown): ApprovedRole | undefined {
  return value === "admin" || value === "recruiter" || value === "hiring_manager"
    ? value
    : undefined;
}

export function buildApprovalResponse(input: ApprovalResponseInput) {
  return {
    requestId: input.requestId,
    authUserId: input.authUserId,
    status: input.status
  };
}

export function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "Recruiter";
  const words = localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean);

  const name = words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

  return name || "Recruiter";
}
