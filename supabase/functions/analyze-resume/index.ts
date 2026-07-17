/**
 * analyze-resume — real evidence analysis via OpenRouter.
 *
 * Replaces the scripted demoUploadEngine output with a real model call. Given a
 * resume's extracted text plus the job's criteria, it returns a job-related
 * evidence matrix, missing-evidence list, verification notes, interview
 * questions, and recruiter notes — following the product safety rules:
 *   - AI assists, a human decides. The model never returns a hire/reject verdict.
 *   - Factual "evidence found / missing / needs verification" language only.
 *   - Protected characteristics are never used or inferred.
 *
 * Secrets (set with `supabase secrets set`):
 *   OPENROUTER_API_KEY  (required)  — your OpenRouter key
 *   OPENROUTER_MODEL    (optional)  — e.g. "anthropic/claude-opus-4.1"
 *                                     defaults to "anthropic/claude-3.5-sonnet"
 */

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";
const CONFIDENCE = ["High", "Medium", "Low", "None"] as const;
const TONES = ["neutral", "success", "warning", "danger", "info"] as const;
const SOURCES = ["Resume", "Questionnaire", "Recruiter note", "System"] as const;

type Criterion = { id: string; label: string };

type AnalyzeRequest = {
  resumeText?: string;
  candidateName?: string;
  job?: { title?: string; criteria?: Criterion[] };
};

function bad(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: cors });
}

const SYSTEM_PROMPT = `You are an evidence analyst for a hiring-evidence tool. You read one candidate's resume against one job's required criteria and report, criterion by criterion, what the resume PROVES, what is MISSING, and what a recruiter should VERIFY in an interview.

Hard rules — never break these:
- You do NOT decide. Never recommend hiring or rejecting, never call anyone the "best" or a "perfect match", never output a score or ranking. A human recruiter makes the final decision.
- Use factual, job-related language only: "evidence found", "evidence missing", "needs verification", "no clear evidence". Never "great candidate", "weak", "perfect", "bias-free".
- Never use or infer protected characteristics (age, gender, race, religion, marital/pregnancy/caregiving status, disability, health, nationality unless genuinely job-relevant, photo). Judge only job-related evidence.
- Ground every claim in the resume text. If evidence is absent, say it is missing — do not assume or invent it.

Return ONLY a single JSON object (no markdown fences, no prose) with exactly this shape:
{
  "overallStatus": "Evidence report ready" | "Human review required",
  "evidenceSummary": [
    { "label": "Evidence match", "value": "<short>", "detail": "<one sentence>", "tone": "success|warning|danger|info" },
    { "label": "Verification needed", "value": "<short>", "detail": "<one sentence>", "tone": "success|warning|danger|info" },
    { "label": "Missing evidence", "value": "<short>", "detail": "<one sentence>", "tone": "success|warning|danger|info" },
    { "label": "Human decision", "value": "Decision reason required", "detail": "Final decisions stay with the hiring team.", "tone": "info" }
  ],
  "requirementEvidence": [
    {
      "criteriaId": "<the criterion id given to you>",
      "requirement": "<the criterion label>",
      "evidence": "<what the resume shows for this requirement, or that no clear evidence was found>",
      "source": "Resume",
      "confidence": "High|Medium|Low|None",
      "verificationNeeded": "<what to confirm in interview, or 'None'>",
      "status": { "label": "<Strong evidence|Needs verification|Missing evidence|Human review required>", "tone": "success|warning|danger|info" }
    }
  ],
  "missingEvidence": ["<gap the recruiter should check>"],
  "suggestedInterviewQuestions": ["<evidence-seeking question tied to a criterion>"],
  "recruiterNotes": ["<short, factual note for the recruiter>"]
}

Produce exactly one requirementEvidence entry per criterion given, in the same order. Use "High" confidence only for clearly demonstrated, specific experience; "Low"/"None" when the resume does not support the criterion.`;

function buildUserPrompt(jobTitle: string, criteria: Criterion[], resumeText: string, candidateName?: string): string {
  const criteriaList = criteria.map((c, i) => `${i + 1}. [id: ${c.id}] ${c.label}`).join("\n");
  return [
    `JOB TITLE: ${jobTitle}`,
    candidateName ? `CANDIDATE: ${candidateName}` : "",
    ``,
    `REQUIRED CRITERIA (produce one requirementEvidence entry per criterion, same order, echoing the exact id):`,
    criteriaList,
    ``,
    `RESUME TEXT:`,
    `"""`,
    resumeText.slice(0, 24000),
    `"""`,
    ``,
    `Analyze the resume against each criterion and return the JSON object described in the system message. JSON only.`
  ].filter(Boolean).join("\n");
}

/** Pull a JSON object out of a model response that may include stray text/fences. */
function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Coerce/validate the model output so the app always gets a well-formed shape. */
function normalize(raw: any, criteria: Criterion[]): unknown {
  const clampTone = (t: unknown) => (TONES.includes(t as any) ? t : "info");
  const clampConf = (c: unknown) => (CONFIDENCE.includes(c as any) ? c : "None");
  const clampSource = (s: unknown) => (SOURCES.includes(s as any) ? s : "Resume");

  const byId = new Map<string, any>();
  for (const item of Array.isArray(raw?.requirementEvidence) ? raw.requirementEvidence : []) {
    if (item && typeof item.criteriaId === "string") byId.set(item.criteriaId, item);
  }

  const requirementEvidence = criteria.map((c) => {
    const item = byId.get(c.id) ?? {};
    const verification = typeof item.verificationNeeded === "string" ? item.verificationNeeded : "None";
    return {
      criteriaId: c.id,
      requirement: c.label,
      evidence: typeof item.evidence === "string" ? item.evidence : "No clear evidence found in the resume.",
      source: clampSource(item.source),
      confidence: clampConf(item.confidence),
      verificationNeeded: verification.trim() || "None",
      status: {
        label: typeof item?.status?.label === "string" ? item.status.label : "Human review required",
        tone: clampTone(item?.status?.tone)
      }
    };
  });

  const asStringList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

  const summary = Array.isArray(raw?.evidenceSummary) ? raw.evidenceSummary : [];
  const evidenceSummary = summary
    .filter((c: any) => c && typeof c.label === "string")
    .map((c: any) => ({
      label: c.label,
      value: typeof c.value === "string" ? c.value : "",
      detail: typeof c.detail === "string" ? c.detail : "",
      tone: clampTone(c.tone)
    }));

  return {
    overallStatus: raw?.overallStatus === "Evidence report ready" ? "Evidence report ready" : "Human review required",
    evidenceSummary,
    requirementEvidence,
    missingEvidence: asStringList(raw?.missingEvidence),
    verificationNeeded: requirementEvidence
      .filter((r) => r.verificationNeeded && r.verificationNeeded !== "None")
      .map((r) => `${r.requirement}: ${r.verificationNeeded}`),
    suggestedInterviewQuestions: asStringList(raw?.suggestedInterviewQuestions),
    recruiterNotes: asStringList(raw?.recruiterNotes)
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return bad(405, "POST only");

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return bad(500, "OPENROUTER_API_KEY is not set as a Supabase secret");
  const model = Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_MODEL;

  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return bad(400, "invalid JSON body");
  }

  const resumeText = (body.resumeText ?? "").trim();
  const jobTitle = (body.job?.title ?? "").trim();
  const criteria = Array.isArray(body.job?.criteria)
    ? body.job!.criteria!.filter((c) => c && typeof c.id === "string" && typeof c.label === "string")
    : [];

  if (!resumeText) return bad(400, "resumeText is required");
  if (!jobTitle) return bad(400, "job.title is required");
  if (criteria.length === 0) return bad(400, "job.criteria must be a non-empty list of { id, label }");

  const userPrompt = buildUserPrompt(jobTitle, criteria, resumeText, body.candidateName);

  let orResponse: Response;
  try {
    orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hiring-evidence-system.vercel.app",
        "X-Title": "Hiring Evidence System"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });
  } catch (error) {
    return bad(502, `OpenRouter request failed: ${error instanceof Error ? error.message : "network error"}`);
  }

  if (!orResponse.ok) {
    const detail = await orResponse.text().catch(() => "");
    return bad(502, `OpenRouter returned ${orResponse.status}. Check OPENROUTER_MODEL ("${model}") and credit. ${detail.slice(0, 300)}`);
  }

  let content = "";
  try {
    const data = await orResponse.json();
    content = data?.choices?.[0]?.message?.content ?? "";
  } catch {
    return bad(502, "could not read OpenRouter response");
  }
  if (!content.trim()) return bad(502, "OpenRouter returned an empty completion");

  let analysis: unknown;
  try {
    analysis = normalize(extractJson(content), criteria);
  } catch (error) {
    return bad(502, `model did not return valid JSON: ${error instanceof Error ? error.message : "parse error"}`);
  }

  return new Response(JSON.stringify({ ok: true, model, analysis }), { headers: cors });
});
