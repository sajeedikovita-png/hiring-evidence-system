import type { SupabaseClient } from "@supabase/supabase-js";
import { privateCandidateDocumentBucket } from "./secureUploadService";

export const maxDocumentAnalysisBytes = 10 * 1024 * 1024;
export const maxDocumentAnalysisPages = 25;
export const maxDocumentAnalysisCharacters = 24_000;

export type DocumentExtractionMethod = "browser_pdf_text" | "browser_docx_raw_text";

export type DocumentTextExtraction = {
  documentId: string;
  fileName: string;
  method: DocumentExtractionMethod;
  text: string;
  pageCount: number;
  pageLabels: string[];
  truncated: boolean;
  warnings: string[];
};

type StoredDocument = {
  id: string;
  file_name: string;
  file_type: "pdf" | "docx";
  file_size_bytes: number;
  storage_path: string;
};

function safeText(value: string): string {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
}

function requireSupportedDocument(document: StoredDocument) {
  if (document.file_type !== "pdf" && document.file_type !== "docx") {
    throw new Error("This private source is not a supported PDF or DOCX document.");
  }
  if (!Number.isFinite(document.file_size_bytes) || document.file_size_bytes <= 0 || document.file_size_bytes > maxDocumentAnalysisBytes) {
    throw new Error("This document exceeds the 10 MB analysis limit. Use manual review.");
  }
}

function limitText(parts: string[], warnings: string[]) {
  let text = "";
  for (const part of parts) {
    const separator = text ? "\n\n" : "";
    if (text.length + separator.length + part.length > maxDocumentAnalysisCharacters) {
      const remaining = maxDocumentAnalysisCharacters - text.length - separator.length;
      if (remaining > 0) text += `${separator}${part.slice(0, remaining)}`;
      warnings.push(`Text reached the ${maxDocumentAnalysisCharacters.toLocaleString()} character limit.`);
      return { text: safeText(text), truncated: true };
    }
    text += `${separator}${part}`;
  }
  return { text: safeText(text), truncated: false };
}

async function extractPdfText(file: Blob, documentId: string, fileName: string): Promise<DocumentTextExtraction> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>>["promise"] extends Promise<infer T> ? T : never;
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise;
  } catch {
    throw new Error("PDF text could not be read. Password-protected or image-only PDFs need manual review.");
  }

  const warnings: string[] = [];
  const pagesToRead = Math.min(pdf.numPages, maxDocumentAnalysisPages);
  if (pdf.numPages > maxDocumentAnalysisPages) {
    warnings.push(`Only the first ${maxDocumentAnalysisPages} of ${pdf.numPages} pages were extracted.`);
  }
  const pageLabels: string[] = [];
  const parts: string[] = [];
  for (let number = 1; number <= pagesToRead; number += 1) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    const pageText = safeText(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    const label = `Page ${number}`;
    pageLabels.push(label);
    parts.push(`[${label}]\n${pageText}`);
  }
  const bounded = limitText(parts, warnings);
  const truncated = bounded.truncated || pdf.numPages > maxDocumentAnalysisPages;
  if (!bounded.text.replace(/\[Page \d+\]/g, "").trim()) {
    throw new Error("This PDF has no selectable text. Image-only PDFs need manual review.");
  }
  return { documentId, fileName, method: "browser_pdf_text", text: bounded.text, pageCount: pdf.numPages, pageLabels, truncated, warnings };
}

async function extractDocxText(file: Blob, documentId: string, fileName: string): Promise<DocumentTextExtraction> {
  const mammothModule = await import("mammoth");
  const mammoth = ("default" in mammothModule && mammothModule.default ? mammothModule.default : mammothModule) as typeof mammothModule;
  let result: { value?: unknown; messages?: Array<{ message?: unknown }> };
  try {
    const arrayBuffer = await file.arrayBuffer();
    result = await mammoth.extractRawText(
      typeof window === "undefined" ? { buffer: new Uint8Array(arrayBuffer) } : { arrayBuffer }
    );
  } catch {
    throw new Error("DOCX text could not be read. Use manual review for this source.");
  }
  const warnings = (result.messages ?? [])
    .map((message) => (typeof message.message === "string" ? message.message : ""))
    .filter(Boolean)
    .slice(0, 5);
  const bounded = limitText([safeText(typeof result.value === "string" ? result.value : "")], warnings);
  if (!bounded.text) throw new Error("This DOCX has no readable text. Use manual review for this source.");
  return {
    documentId,
    fileName,
    method: "browser_docx_raw_text",
    text: bounded.text,
    pageCount: 0,
    pageLabels: [],
    truncated: bounded.truncated,
    warnings
  };
}

/** Reads an RLS-authorized private object into local memory only; it never renders document HTML. */
export async function extractPrivateDocumentText(client: SupabaseClient, documentId: string): Promise<DocumentTextExtraction> {
  const { data, error } = await client
    .from("uploaded_documents")
    .select("id,file_name,file_type,file_size_bytes,storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !data) throw new Error("Private source is not available in this workspace.");
  const document = data as StoredDocument;
  requireSupportedDocument(document);
  const { data: file, error: downloadError } = await client.storage.from(privateCandidateDocumentBucket).download(document.storage_path);
  if (downloadError || !file) throw new Error("Private source could not be retrieved for local text extraction.");
  return document.file_type === "pdf"
    ? extractPdfText(file, document.id, document.file_name)
    : extractDocxText(file, document.id, document.file_name);
}
