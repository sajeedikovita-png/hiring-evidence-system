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
  uploaderAttestation: boolean;
}): Promise<void> {
  for (const file of input.files) {
    const validation = validateSecureCandidateUpload(file);
    if (!validation.valid) throw new Error(validation.message);

    const extension = file.name.split(".").pop()?.toLowerCase();
    const { data, error } = await input.client.rpc("record_candidate_upload", {
      p_job_id: input.jobId,
      p_candidate_name: "",
      p_file_name: file.name,
      p_file_type: extension,
      p_file_size_bytes: file.size,
      p_consent_confirmed: input.uploaderAttestation
    });
    if (error || !data || typeof data !== "object") throw new Error("Unable to record candidate upload");
    const record = data as { document_id?: string; storage_path?: string };
    if (!record.document_id || !record.storage_path) throw new Error("Upload record was incomplete");

    const { error: storageError } = await input.client.storage
      .from(privateCandidateDocumentBucket)
      .upload(record.storage_path, file, { contentType: file.type || undefined, upsert: false });
    if (storageError) {
      await input.client.rpc("mark_candidate_upload_failed", {
        p_document_id: record.document_id,
        p_reason: "Private document storage could not be completed"
      });
      throw new Error("Unable to store document securely");
    }
  }
}
