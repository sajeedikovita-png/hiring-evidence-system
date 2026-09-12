import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentTextExtraction } from "./documentTextService";

export type DocumentAnalysisStatus = "completed" | "processing" | "failed" | "claimed";

export type DocumentAnalysisResult = {
  status: DocumentAnalysisStatus;
  reportCode?: string;
  message: string;
};

export function canSubmitDocumentAnalysis(extraction: DocumentTextExtraction | undefined): extraction is DocumentTextExtraction {
  return Boolean(extraction && extraction.text.trim() && !extraction.truncated && extraction.text.length <= 24_000);
}

export async function requestDocumentEvidenceAnalysis(
  client: SupabaseClient,
  extraction: DocumentTextExtraction
): Promise<DocumentAnalysisResult> {
  if (!canSubmitDocumentAnalysis(extraction)) {
    throw new Error("This extracted source is incomplete and cannot be sent for analysis. Use manual review.");
  }
  const { data, error } = await client.functions.invoke("analyze-resume", {
    body: {
      documentId: extraction.documentId,
      extractedText: extraction.text,
      extractionMethod: extraction.method,
      extractionMetadata: {
        pageCount: extraction.pageCount,
        pageLabels: extraction.pageLabels,
        warnings: extraction.warnings
      }
    }
  });
  if (error) throw new Error("Analysis could not be completed. Use manual review or try again later.");
  const response = data as { status?: unknown; reportCode?: unknown; message?: unknown } | null;
  if (!response || !["completed", "processing", "failed", "claimed"].includes(String(response.status))) {
    throw new Error("Analysis response was incomplete. Use manual review.");
  }
  return {
    status: response.status as DocumentAnalysisStatus,
    reportCode: typeof response.reportCode === "string" ? response.reportCode : undefined,
    message: typeof response.message === "string" ? response.message : "Human review remains required."
  };
}
