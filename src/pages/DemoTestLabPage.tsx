import React from "react";
import { Badge } from "../../components/ui/Badge";
import { DataTable } from "../../components/ui/DataTable";
import { PublicHeader } from "../components/layout/PublicHeader";
import { getDemoTestLabViewModel, type DemoResumeRecord } from "../services/demoTestLabService";
import type { BadgeTone, EvidenceLevel } from "../types/hiring";

function getEvidenceTone(level: EvidenceLevel): BadgeTone {
  if (level === "Strong evidence") return "success";
  if (level === "Good evidence, verification needed" || level === "Needs human review") return "warning";
  if (level === "Missing key evidence" || level === "Report failed") return "danger";
  return "info";
}

function getOutcomeBadge(resume: DemoResumeRecord) {
  const isMatch = resume.actualEvidenceLevel === resume.expectedEvidenceLevel;

  return <Badge tone={isMatch ? "success" : "warning"}>{isMatch ? "Expected outcome match" : "Review demo result"}</Badge>;
}

export function DemoTestLabPage() {
  const demo = getDemoTestLabViewModel();

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="demo-lab-page">
        <section className="demo-lab-hero">
          <div>
            <p className="section-kicker">Demo Test Lab</p>
            <h1>Show how evidence grouping works before a pilot.</h1>
            <p>
              {demo.testSetDescription} This demo proves whether evidence grouping matches the controlled test set. It does
              not make hiring decisions.
            </p>
          </div>
          <div className="demo-lab-context">
            <span>Company</span>
            <strong>{demo.companyName}</strong>
            <span>Role</span>
            <strong>{demo.jobTitle}</strong>
            <span>Test set</span>
            <strong>{demo.testSetName}</strong>
          </div>
        </section>

        <section className="demo-lab-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Test results</p>
              <h2>60 synthetic resumes across controlled categories</h2>
            </div>
            <Badge tone="info">Human review required</Badge>
          </div>
          <div className="demo-metric-grid">
            {demo.metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-lab-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Scenario categories</p>
              <h2>Every test category is represented.</h2>
            </div>
          </div>
          <div className="demo-category-grid">
            {demo.categorySummaries.map((summary) => (
              <article className="demo-category-card" key={summary.category}>
                <h3>{summary.category}</h3>
                <div>
                  <span>{summary.count} resumes</span>
                  <span>{summary.expectedOutcomeMatches} expected matches</span>
                  <span>{summary.humanReviewRequired} human-review records</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-lab-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Synthetic resume set</p>
              <h2>Expected evidence outcome versus observed grouping</h2>
              <p className="muted">
                Use this table to explain which evidence was found, what is missing, and where verification is needed.
              </p>
            </div>
          </div>
          <DataTable
            caption="Demo resume test results"
            columns={[
              { key: "candidateName", header: "Candidate" },
              { key: "resumeCategory", header: "Category" },
              { key: "expectedEvidenceLevel", header: "Expected evidence group" },
              { key: "actualEvidenceLevel", header: "Observed grouping" },
              { key: "reportStatus", header: "Report status" },
              { key: "recommendedRecruiterAction", header: "Recruiter action" },
              { key: "outcome", header: "Test result" }
            ]}
            rows={demo.resumes.map((resume) => ({
              candidateName: <strong>{resume.candidateName}</strong>,
              resumeCategory: resume.resumeCategory,
              expectedEvidenceLevel: <Badge tone={getEvidenceTone(resume.expectedEvidenceLevel)}>{resume.expectedEvidenceLevel}</Badge>,
              actualEvidenceLevel: <Badge tone={getEvidenceTone(resume.actualEvidenceLevel)}>{resume.actualEvidenceLevel}</Badge>,
              reportStatus: resume.reportStatus,
              recommendedRecruiterAction: resume.recommendedRecruiterAction,
              outcome: getOutcomeBadge(resume)
            }))}
          />
        </section>
      </main>
    </div>
  );
}
