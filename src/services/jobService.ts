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
  if (error || !data || typeof data !== "object" || !(data as { job_id?: string }).job_id) {
    throw new Error("Unable to create job role.");
  }
  return { jobId: (data as { job_id: string }).job_id };
}
