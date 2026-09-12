import assert from "node:assert/strict";
import fs from "node:fs";
import { Blob } from "node:buffer";
import { canSubmitDocumentAnalysis } from "../src/services/documentAnalysisService";
import { extractPrivateDocumentText, maxDocumentAnalysisCharacters } from "../src/services/documentTextService";

function privateDocumentClient(fileName: string, fileType: "pdf" | "docx", bytes: Buffer) {
  const document = { id: "document-1", file_name: fileName, file_type: fileType, file_size_bytes: bytes.length, storage_path: "company/job/document" };
  return {
    from() { return { select() { return { eq() { return { maybeSingle: async () => ({ data: document, error: null }) }; } }; } }; },
    storage: { from() { return { download: async () => ({ data: new Blob([bytes]), error: null }) }; } }
  } as never;
}

async function run() {
  const pdfBytes = fs.readFileSync("tests/fixtures/synthetic-pilot-candidate.pdf");
  const pdf = await extractPrivateDocumentText(privateDocumentClient("Synthetic Pilot Candidate.pdf", "pdf", pdfBytes), "document-1");
  assert.equal(pdf.method, "browser_pdf_text");
  assert.match(pdf.text, /Page 1/);
  assert.ok(pdf.text.length > 20, "actual PDF fixture must yield source text");
  assert.deepEqual(pdf.pageLabels, ["Page 1"]);
  assert.equal(pdf.truncated, false);

  const docxBytes = fs.readFileSync("tests/fixtures/hiring-synthetic-cv.docx");
  const docx = await extractPrivateDocumentText(privateDocumentClient("Hiring Synthetic CV.docx", "docx", docxBytes), "document-1");
  assert.equal(docx.method, "browser_docx_raw_text");
  assert.ok(docx.text.length > 20, "actual DOCX fixture must yield raw text");
  assert.equal(docx.truncated, false);

  assert.equal(canSubmitDocumentAnalysis({ ...docx, text: "", truncated: false }), false, "empty text must not be sent");
  assert.equal(canSubmitDocumentAnalysis({ ...docx, text: "source", truncated: true }), false, "truncated source must not be sent");
  assert.equal(canSubmitDocumentAnalysis({ ...docx, text: "x".repeat(maxDocumentAnalysisCharacters + 1), truncated: false }), false, "oversized text must not be sent");
  console.log("document text service tests passed");
}

run().catch((error) => { console.error(error); process.exit(1); });
