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

export type PilotRequestRecord = PilotRequestInput & {
  id: string;
  status: "pending_contact";
  createdAt: string;
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

const pilotRequestStorageKey = "hiring-evidence-pilot-requests";

type PilotRequestStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function normalize(value: string) {
  return value.trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPilotRequestStorage(): PilotRequestStorage | undefined {
  const storage = globalThis.localStorage as unknown;

  if (
    storage &&
    typeof storage === "object" &&
    "getItem" in storage &&
    "setItem" in storage &&
    typeof (storage as PilotRequestStorage).getItem === "function" &&
    typeof (storage as PilotRequestStorage).setItem === "function"
  ) {
    return storage as PilotRequestStorage;
  }

  return undefined;
}

export function validatePilotRequest(input: PilotRequestInput): PilotRequestValidationResult {
  const errors: PilotRequestErrors = {};

  if (!normalize(input.companyName)) errors.companyName = "Enter a company name.";
  if (!isValidEmail(normalize(input.workEmail))) errors.workEmail = "Enter a valid work email.";
  if (!normalize(input.requesterRole)) errors.requesterRole = "Enter your role.";
  if (!normalize(input.hiringVolume)) errors.hiringVolume = "Choose the hiring volume.";
  if (!normalize(input.firstRoleToReview)) errors.firstRoleToReview = "Enter the first role to review.";

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function createPilotRequestRecord(input: PilotRequestInput, createdAt = new Date().toISOString()): PilotRequestRecord {
  return {
    id: `pilot-${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    status: "pending_contact",
    createdAt,
    companyName: normalize(input.companyName),
    workEmail: normalize(input.workEmail),
    requesterRole: normalize(input.requesterRole),
    hiringVolume: normalize(input.hiringVolume),
    firstRoleToReview: normalize(input.firstRoleToReview),
    note: normalize(input.note)
  };
}

export function readStoredPilotRequests(): PilotRequestRecord[] {
  const storage = getPilotRequestStorage();
  if (!storage) return [];

  try {
    const rawRequests = storage.getItem(pilotRequestStorageKey);
    if (!rawRequests) return [];
    const parsed = JSON.parse(rawRequests);
    return Array.isArray(parsed) ? (parsed as PilotRequestRecord[]) : [];
  } catch {
    return [];
  }
}

export function submitPilotRequest(input: PilotRequestInput): PilotRequestSubmissionResult {
  const validation = validatePilotRequest(input);

  if (!validation.valid) {
    return {
      status: "validation_failed",
      errors: validation.errors
    };
  }

  const request = createPilotRequestRecord(input);

  const storage = getPilotRequestStorage();

  if (storage) {
    const requests = [request, ...readStoredPilotRequests()];
    storage.setItem(pilotRequestStorageKey, JSON.stringify(requests));
  }

  return {
    status: "pending_contact",
    request
  };
}
