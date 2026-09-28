import type { SupabaseClient } from "@supabase/supabase-js";

export type JobCriterionInput = { label: string; description?: string; priority: "required" | "preferred" };

export type CreateJobInput = {
  title: string;
  department?: string;
  location?: string;
  employmentType?: string;
  criteria: JobCriterionInput[];
};

export function validateCreateJobInput(input: CreateJobInput): string | undefined {
  if (!input.title.trim()) return "Enter a job title.";
  if (!input.criteria.some((criterion) => criterion.label.trim() && criterion.priority === "required")) {
    return "Add at least one required, job-related criterion.";
  }
  return undefined;
}

export async function createJobWithCriteria(client: SupabaseClient, input: CreateJobInput): Promise<{ jobId: string }> {
  const validation = validateCreateJobInput(input);
  if (validation) throw new Error(validation);
  const { data, error } = await client.rpc("create_job_with_criteria", {
    p_title: input.title.trim(),
    p_department: input.department?.trim() ?? "",
    p_location: input.location?.trim() ?? "",
    p_employment_type: input.employmentType?.trim() ?? "",
    p_criteria: input.criteria.filter((criterion) => criterion.label.trim()).map((criterion) => ({
      label: criterion.label.trim(),
      description: criterion.description?.trim() || criterion.label.trim(),
      priority: criterion.priority
    }))
  });
  if (error) {
    if (error.message.includes("PILOT_JOB_LIMIT")) throw new Error("Your active-role limit is reached. Close an existing role or review your current allowance in Pilot access before creating another role.");
    if (error.message.includes("PILOT_EXPIRED")) throw new Error("Renew workspace access before creating another role.");
    if (error.message.includes("JOB_MANAGEMENT_ACCESS_REQUIRED")) throw new Error("Only a company administrator or recruiter can create roles.");
    throw new Error("Unable to create job role.");
  }
  if (!data || typeof data !== "object" || !(data as { job_id?: string }).job_id) throw new Error("Unable to create job role.");
  return { jobId: (data as { job_id: string }).job_id };
}

export async function updateJobRoleStatus(
  client: Pick<SupabaseClient, "rpc">,
  input: { jobId: string; status: "open" | "closed" }
): Promise<{ jobId: string; status: "open" | "closed" }> {
  const { data, error } = await client.rpc("update_job_role_status", { p_job_id: input.jobId, p_status: input.status });
  if (error) {
    if (error.message.includes("PILOT_JOB_LIMIT")) throw new Error("Your active-role limit is reached. Close another role before reopening this one.");
    if (error.message.includes("PILOT_EXPIRED")) throw new Error("Renew workspace access before changing a job's status.");
    if (error.message.includes("JOB_MANAGEMENT_ACCESS_REQUIRED")) throw new Error("Only a company administrator or recruiter can close or reopen roles.");
    throw new Error("Unable to update this job's status.");
  }
  if (!data || typeof data !== "object" || typeof data.jobId !== "string" || (data.status !== "open" && data.status !== "closed")) throw new Error("Job status response was invalid.");
  return { jobId: data.jobId, status: data.status };
}
