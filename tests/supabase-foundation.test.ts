import assert from "node:assert/strict";

import { getActiveCompanyContext } from "../src/services/companyContextService";
import { containsForbiddenHiringLanguage } from "../src/services/compliance";
import { getAsyncHiringRepository, getHiringRepositoryMode, getReportById } from "../src/services/hiringRepository";
import { saveHumanReviewDecision } from "../src/services/reportService";
import { loadSupabaseConfig } from "../src/services/supabaseConfig";

assert.throws(
  () => loadSupabaseConfig({}),
  /Missing Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY/
);

const envWithSupabase = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "example-anon-key"
};

const supabaseConfig = loadSupabaseConfig(envWithSupabase);
assert.equal(supabaseConfig.url, "https://example.supabase.co");
assert.equal(supabaseConfig.anonKey, "example-anon-key");

assert.equal(getHiringRepositoryMode(envWithSupabase), "supabase");
assert.equal(getHiringRepositoryMode({}), "seed");

const supabaseRepository = getAsyncHiringRepository(envWithSupabase);
assert.equal(supabaseRepository.source, "supabase");

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function run() {
  const seedRepository = getAsyncHiringRepository({});
  assert.equal(seedRepository.source, "seed");

  const companyContext = getActiveCompanyContext();
  const fallbackReport = await seedRepository.getReportById(companyContext.companyId, "report-amanda-lee");
  assert.equal(fallbackReport?.candidate.name, "Amanda Lee");
  assert.equal(getReportById(companyContext.companyId, "report-amanda-lee")?.candidate.name, "Amanda Lee");

  const rejectedDecision = await seedRepository.saveHumanReviewDecision({
    companyId: companyContext.companyId,
    reportId: "report-amanda-lee",
    applicationId: "application-amanda-frontend",
    userId: companyContext.userId,
    decision: "Shortlist for interview",
    reason: "",
    timestamp: "2026-05-24T09:00:00.000Z"
  });
  assert.equal(rejectedDecision.valid, false);
  assert.equal(rejectedDecision.message, "Decision reason required");

  assert.equal(containsForbiddenHiringLanguage("Evidence report ready. Human review required."), false);
  assert.equal(containsForbiddenHiringLanguage("best candidate"), true);

  console.log("Supabase repository foundation tests passed.");
}
