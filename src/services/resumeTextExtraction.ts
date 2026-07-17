/**
 * Client-side résumé text extraction.
 *
 * Reads the real bytes of an uploaded PDF or DOCX in the browser and returns
 * plain text to send to the analysis function. Doing this on the client keeps
 * the raw file out of any extra server hop — only the extracted text is sent on.
 *
 * pdfjs and its worker are imported lazily inside the PDF path so this module
 * stays importable in a plain Node context (tests) where the Vite `?url` asset
 * import and browser-only pdfjs globals aren't available.
 */

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdfText(file);
  if (name.endsWith(".docx")) return extractDocxText(file);
  if (name.endsWith(".txt")) return (await file.text()).trim();
  throw new Error(`Unsupported file type for text extraction: ${file.name}`);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n").replace(/[ \t]+\n/g, "\n").trim();
  } finally {
    await doc.destroy();
  }
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return String(result.value ?? "").trim();
}
