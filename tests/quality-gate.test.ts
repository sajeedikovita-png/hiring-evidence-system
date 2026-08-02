import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { forbiddenHiringPhrases } from "../src/services/compliance";

const repoRoot = process.cwd();
const agentsPath = path.join(repoRoot, "AGENTS.md");
const workflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");

assert.equal(existsSync(agentsPath), true, "AGENTS.md must exist at the repo root.");
assert.equal(existsSync(workflowPath), true, "GitHub Actions CI workflow must exist at .github/workflows/ci.yml.");

const agents = readFileSync(agentsPath, "utf8");
const requiredAgentRules = [
  "This is a real B2B product, not a demo.",
  "Mock data is only temporary seed/dev scaffolding.",
  "AI assists. Human decides. Evidence explains.",
  "Pages must use services/repositories, not direct mock imports.",
  "Human hiring decisions require a human-entered reason.",
  "Every task must investigate the repo first.",
  "Every task must end with typecheck, test, build, and audit.",
  "Keep commits small and production-focused."
];

for (const rule of requiredAgentRules) {
  assert.match(agents, new RegExp(escapeRegExp(rule)), `AGENTS.md is missing rule: ${rule}`);
}

for (const phrase of forbiddenHiringPhrases) {
  assert.match(agents.toLowerCase(), new RegExp(escapeRegExp(phrase.toLowerCase())), `AGENTS.md must list forbidden phrase: ${phrase}`);
}

const workflow = readFileSync(workflowPath, "utf8");
for (const command of ["npm run typecheck", "npm run test", "npm run build", "npm audit --audit-level=high"]) {
  assert.match(workflow, new RegExp(escapeRegExp(command)), `CI is missing command: ${command}`);
}

const appCodeFindings = findForbiddenPhrases(path.join(repoRoot, "src"));
assert.deepEqual(appCodeFindings, [], "Forbidden hiring phrases must not appear in app code outside the compliance allowlist.");

for (const pagePath of [
  path.join(repoRoot, "src", "pages", "JobCandidateListPage.tsx"),
  path.join(repoRoot, "src", "pages", "BulkUploadCandidatesPage.tsx")
]) {
  const pageSource = readFileSync(pagePath, "utf8");
  assert.doesNotMatch(pageSource, /services\/mockSelectors/, `${path.relative(repoRoot, pagePath)} must load through repository services.`);
  assert.match(pageSource, /getAsyncHiringRepository/, `${path.relative(repoRoot, pagePath)} must use the async hiring repository.`);
}

// A customer workspace must never be handed a scripted preview report while being
// told the model read their candidate's CV. Keeping the demo engine out of the
// pilot upload path is what makes that structural rather than a matter of care.
const pilotUploadSource = readFileSync(path.join(repoRoot, "src", "services", "pilotUploadService.ts"), "utf8");
for (const demoModule of ["demoUploadEngine", "mockHiringData", "mockSelectors"]) {
  assert.doesNotMatch(
    pilotUploadSource,
    new RegExp(`from "\\.\\/${demoModule}"`),
    `pilotUploadService.ts must not import ${demoModule} — customer uploads have no scripted fallback.`
  );
}

function findForbiddenPhrases(dir: string): string[] {
  const findings: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findings.push(...findForbiddenPhrases(fullPath));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (fullPath.endsWith(path.join("src", "services", "compliance.ts"))) continue;

    const content = readFileSync(fullPath, "utf8").toLowerCase();
    for (const phrase of forbiddenHiringPhrases) {
      if (content.includes(phrase.toLowerCase())) {
        findings.push(`${path.relative(repoRoot, fullPath)}: ${phrase}`);
      }
    }
  }

  return findings;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

console.log("Repo quality gate passed.");
