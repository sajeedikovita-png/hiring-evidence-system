import { createHiringSupabaseClient } from "./supabaseClient";

export type PilotRequestInput = {
  companyName: string;
  workEmail: string;
  requesterRole: string;
  hiringVolume: string;
  firstRoleToReview: string;
  note: string;
};

export type PilotRequestErrors = Partial<Record<keyof PilotRequestInput, string>>;

export type PilotRequestValidationResult = {
  valid: boolean;
  errors: PilotRequestErrors;
};

export type PilotRequestRecord = {
  id: string;
  status: "pending";
};

export type PilotRequestSubmissionResult =
  | {
      status: "pending_contact";
      request: PilotRequestRecord;
    }
  | {
      status: "validation_failed";
      errors: PilotRequestErrors;
    };

type FunctionsClient = {
  functions: {
    invoke: (
      name: string,
      options: { body: PilotRequestInput }
    ) => Promise<{
      data: unknown;
      error: { message?: string } | null;
    }>;
  };
};

function normalize(value: string) {
  return value.trim();
}

function normalizePilotRequest(input: PilotRequestInput): PilotRequestInput {
  return {
    companyName: normalize(input.companyName),
    workEmail: normalize(input.workEmail).toLowerCase(),
    requesterRole: normalize(input.requesterRole),
    hiringVolume: normalize(input.hiringVolume),
    firstRoleToReview: normalize(input.firstRoleToReview),
    note: normalize(input.note)
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePilotRequest(input: PilotRequestInput): PilotRequestValidationResult {
  const normalized = normalizePilotRequest(input);
  const errors: PilotRequestErrors = {};

  if (!normalized.companyName) errors.companyName = "Enter a company name.";
  if (!isValidEmail(normalized.workEmail)) errors.workEmail = "Enter a valid work email.";
  if (!normalized.requesterRole) errors.requesterRole = "Enter your role.";
  if (!normalized.hiringVolume) errors.hiringVolume = "Choose the hiring volume.";
  if (!normalized.firstRoleToReview) errors.firstRoleToReview = "Enter the first role to review.";

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export async function submitPilotRequest(
  input: PilotRequestInput,
  client: FunctionsClient = createHiringSupabaseClient()
): Promise<PilotRequestSubmissionResult> {
  const normalized = normalizePilotRequest(input);
  const validation = validatePilotRequest(normalized);

  if (!validation.valid) {
    return {
      status: "validation_failed",
      errors: validation.errors
    };
  }

  const { data, error } = await client.functions.invoke("request-access", {
    body: normalized
  });

  if (error) {
    throw new Error(error.message ?? "Unable to submit access request");
  }

  const response = data as {
    requestId?: string;
    status?: string;
    errors?: PilotRequestErrors;
  } | null;

  if (response?.status === "validation_failed") {
    return {
      status: "validation_failed",
      errors: response.errors ?? {}
    };
  }

  if (!response?.requestId || response.status !== "pending") {
    throw new Error("Access request was not confirmed by the server");
  }

  return {
    status: "pending_contact",
    request: {
      id: response.requestId,
      status: "pending"
    }
  };
}
