import type { SupabaseClient } from "@supabase/supabase-js";

export const privateCandidateDocumentBucket = "candidate-documents";
const maxCandidateDocumentBytes = 10 * 1024 * 1024;

export type CandidateUploadFile = {
  name: string;
  size: number;
  type: string;
};

export function validateSecureCandidateUpload(file: CandidateUploadFile): { valid: true } | { valid: false; message: string } {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowed = extension === "pdf" || extension === "docx";
  if (!allowed) return { valid: false, message: "Unsupported file type" };
  if (file.size <= 0 || file.size > maxCandidateDocumentBytes) return { valid: false, message: "File too large" };
  return { valid: true };
}

export function buildPrivateCandidateDocumentPath(input: {
  companyId: string;
  jobId: string;
  documentId: string;
  fileName: string;
}): string {
  const extension = input.fileName.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") throw new Error("Unsupported file type");
  return `${input.companyId}/${input.jobId}/${input.documentId}.${extension}`;
}

export async function uploadPrivateCandidateDocuments(input: {
  client: SupabaseClient;
  jobId: string;
  files: File[];
}): Promise<void> {
  const { data: authData, error: authError } = await input.client.auth.getUser();
  if (authError || !authData.user) throw new Error("Authenticated company member required");

  const { data: profile, error: profileError } = await input.client
    .from("recruiter_profiles")
    .select("id, company_id")
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (profileError || !profile) throw new Error("Authenticated company member required");

  const { data: job, error: jobError } = await input.client
    .from("job_roles")
    .select("id")
    .eq("id", input.jobId)
    .eq("company_id", profile.company_id)
    .maybeSingle();
  if (jobError || !job) throw new Error("Upload workspace is not available in this company workspace.");

  for (const file of input.files) {
    const validation = validateSecureCandidateUpload(file);
    if (!validation.valid) throw new Error(validation.message);

    const documentId = crypto.randomUUID();
    const storagePath = buildPrivateCandidateDocumentPath({
      companyId: profile.company_id,
      jobId: job.id,
      documentId,
      fileName: file.name
    });
    const { error: storageError } = await input.client.storage
      .from(privateCandidateDocumentBucket)
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
    if (storageError) throw new Error("Unable to store document securely");

    const { data: candidate, error: candidateError } = await input.client
      .from("candidates")
      .insert({ company_id: profile.company_id, name: "Candidate pending review", source: "bulk_upload" })
      .select("id")
      .single();
    if (candidateError || !candidate) throw new Error("Unable to create candidate record");

    const { data: application, error: applicationError } = await input.client
      .from("candidate_applications")
      .insert({ company_id: profile.company_id, job_id: job.id, candidate_id: candidate.id, status: "processing", consent_status: "recorded" })
      .select("id")
      .single();
    if (applicationError || !application) throw new Error("Unable to create application record");

    const { error: documentError } = await input.client.from("uploaded_documents").insert({
      id: documentId,
      company_id: profile.company_id,
      application_id: application.id,
      candidate_id: candidate.id,
      uploaded_by_profile_id: profile.id,
      file_name: file.name,
      storage_path: storagePath,
      file_type: storagePath.endsWith(".pdf") ? "pdf" : "docx",
      file_size_bytes: file.size,
      upload_status: "accepted",
      parsing_status: "queued"
    });
    if (documentError) throw new Error("Unable to record secure document upload");
  }
}
