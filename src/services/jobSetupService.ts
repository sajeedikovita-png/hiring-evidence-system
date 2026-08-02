/**
 * First-role onboarding for an approved company.
 *
 * A newly provisioned workspace has no job and no criteria, and uploads have nothing
 * to analyse against until it does. This is the screen that unblocks a customer
 * without anyone running SQL for them.
 *
 * Validation is duplicated deliberately: these rules exist here for a usable form, and
 * again in `create_job_with_criteria` because the database is the only place a rule is
 * actually enforced.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** The analyzer caps at 12 criteria; a role must not be created that it would truncate. */
export const MAX_JOB_CRITERIA = 12;

export type JobCriterionInput = {
  label: string;
  description: string;
  priority: "required" | "preferred";
};

export type JobSetupInput = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  criteria: JobCriterionInput[];
};

export type JobSetupErrors = {
  title?: string;
  criteria?: string;
};

export type JobSetupValidationResult = {
  valid: boolean;
  errors: JobSetupErrors;
};

export function emptyJobCriterion(): JobCriterionInput {
  return { label: "", description: "", priority: "required" };
}

export function emptyJobSetupInput(): JobSetupInput {
  return {
    title: "",
    department: "",
    location: "",
    employmentType: "",
    criteria: [emptyJobCriterion(), emptyJobCriterion(), emptyJobCriterion()]
  };
}

/** Criteria the recruiter left completely blank are dropped rather than rejected. */
export function getFilledCriteria(criteria: JobCriterionInput[]): JobCriterionInput[] {
  return criteria.filter((criterion) => criterion.label.trim().length > 0);
}

export function validateJobSetup(input: JobSetupInput): JobSetupValidationResult {
  const errors: JobSetupErrors = {};

  if (!input.title.trim()) {
    errors.title = "Enter the role title.";
  }

  const filled = getFilledCriteria(input.criteria);

  if (filled.length === 0) {
    errors.criteria = "Add at least one criterion. This is what each resume is reviewed against.";
  } else if (filled.length > MAX_JOB_CRITERIA) {
    errors.criteria = `Use ${MAX_JOB_CRITERIA} criteria or fewer.`;
  } else if (!filled.some((criterion) => criterion.priority === "required")) {
    errors.criteria = "Mark at least one criterion as required.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Postgres raises bare codes; turn them into something a recruiter can act on. */
export function getJobSetupErrorMessage(rawMessage: string): string {
  if (rawMessage.includes("PILOT_JOB_LIMIT")) {
    return "This workspace has reached its role limit. Contact us to add more roles.";
  }
  if (rawMessage.includes("PILOT_EXPIRED")) {
    return "This workspace is view-only, so new roles cannot be created.";
  }
  if (rawMessage.includes("TOO_MANY_CRITERIA")) {
    return `Use ${MAX_JOB_CRITERIA} criteria or fewer.`;
  }
  if (rawMessage.includes("REQUIRED_CRITERION_MISSING")) {
    return "Mark at least one criterion as required.";
  }
  if (rawMessage.includes("CRITERIA_REQUIRED") || rawMessage.includes("CRITERION_LABEL_REQUIRED")) {
    return "Add at least one criterion with a name.";
  }
  if (rawMessage.includes("TITLE_REQUIRED")) {
    return "Enter the role title.";
  }
  if (rawMessage.includes("AMBIGUOUS_WORKSPACE")) {
    return "Your account belongs to more than one workspace. Contact us so we can set this role up correctly.";
  }
  if (rawMessage.includes("NO_WORKSPACE")) {
    return "This account is not part of a company workspace yet.";
  }

  return "The role could not be created. Please try again.";
}

export type CreatedJob = { jobId: string; criteriaCount: number };

export async function createJobWithCriteria(client: SupabaseClient, input: JobSetupInput): Promise<CreatedJob> {
  const criteria = getFilledCriteria(input.criteria).map((criterion) => ({
    label: criterion.label.trim(),
    description: criterion.description.trim(),
    priority: criterion.priority
  }));

  const { data, error } = await client.rpc("create_job_with_criteria", {
    p_title: input.title.trim(),
    p_department: input.department.trim(),
    p_location: input.location.trim(),
    p_employment_type: input.employmentType.trim(),
    p_criteria: criteria
  });

  if (error) {
    throw new Error(getJobSetupErrorMessage(error.message));
  }

  const result = data as { job_id?: string; criteria_count?: number } | null;
  if (!result?.job_id) {
    throw new Error("The role could not be created. Please try again.");
  }

  return { jobId: result.job_id, criteriaCount: Number(result.criteria_count ?? criteria.length) };
}
