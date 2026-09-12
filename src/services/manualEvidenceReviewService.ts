import type { SupabaseClient } from "@supabase/supabase-js";

export type ManualReviewWorkspace = { fileName: string; sourceUrl: string; requirements: Array<{ id: string; label: string }> };

export async function getPrivateDocumentSourceUrl(client: SupabaseClient, documentId: string): Promise<string> {
  const { data: document, error } = await client.from("uploaded_documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (error || !document) throw new Error("Private source is not available in this workspace.");
  const { data: signed, error: signedError } = await client.storage.from("candidate-documents").createSignedUrl(document.storage_path, 300);
  if (signedError || !signed?.signedUrl) throw new Error("Private source link could not be prepared.");
  return signed.signedUrl;
}

export async function getManualReviewWorkspace(client: SupabaseClient, documentId: string): Promise<ManualReviewWorkspace> {
  const { data: document, error } = await client.from("uploaded_documents").select("storage_path,file_name,application_id").eq("id", documentId).maybeSingle();
  if (error || !document) throw new Error("Private source is not available in this workspace.");
  const { data: application, error: applicationError } = await client.from("candidate_applications").select("job_id").eq("id", document.application_id).maybeSingle();
  if (applicationError || !application) throw new Error("Candidate application is not available.");
  const { data: requirements, error: requirementsError } = await client.from("job_requirements").select("id,label").eq("job_id", application.job_id).order("sort_order");
  if (requirementsError) throw new Error("Job requirements are not available.");
  const sourceUrl = await getPrivateDocumentSourceUrl(client, documentId);
  return { fileName: document.file_name, sourceUrl, requirements: requirements ?? [] };
}

export async function createManualEvidenceReport(client: SupabaseClient, input: { documentId: string; requirementId: string; evidence: string; sourceReference: string; missingEvidence: string; verificationNeeded: string }) {
  if (!input.requirementId || !input.evidence.trim() || !input.sourceReference.trim()) throw new Error("Select a requirement and enter the source-grounded evidence and source reference.");
  const { data, error } = await client.rpc("create_manual_evidence_report", { p_document_id: input.documentId, p_requirement_id: input.requirementId, p_evidence: input.evidence, p_source_reference: input.sourceReference, p_missing_evidence: input.missingEvidence, p_verification_needed: input.verificationNeeded });
  if (error || !data || typeof data !== "object") throw new Error("Unable to create manual evidence report.");
  const code = (data as { public_report_code?: string }).public_report_code;
  if (!code) throw new Error("Manual report was not returned.");
  return code;
}
