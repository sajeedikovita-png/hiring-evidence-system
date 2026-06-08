import React, { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { PublicHeader } from "../components/layout/PublicHeader";
import { getDemoTestLabViewModel } from "../services/demoTestLabService";

const slides = [
  {
    kicker: "Why this exists",
    title: "Hiring reviews need evidence people can explain.",
    body: "Recruiters need to see job-related evidence, missing proof, and verification questions before writing human decision notes.",
    proof: "AI assists. Human decides. Evidence explains."
  },
  {
    kicker: "Controlled test set",
    title: "We start with 60 synthetic resumes.",
    body: "The resumes are grouped into known scenarios, so the demo can show whether the system behaves as expected.",
    proof: "Strong evidence, missing evidence, wrong-role, incomplete, unreadable, and verification-needed cases."
  },
  {
    kicker: "Evidence grouping",
    title: "The system shows evidence found and evidence missing.",
    body: "Each resume receives an evidence group and a report status. Recruiters can inspect the reason instead of trusting a black box.",
    proof: "Good evidence, verification needed. Human review required."
  },
  {
    kicker: "Practical review",
    title: "Recruiters inspect the report before any decision.",
    body: "The report shows requirement evidence, missing evidence, fairness wording checks, and suggested verification questions.",
    proof: "Decision reason required."
  },
  {
    kicker: "Pilot proof",
    title: "The demo proves the workflow, not a hiring outcome.",
    body: "The result is a controlled product demonstration: what was expected, what was observed, and where a recruiter must verify.",
    proof: "Evidence report ready. Human review required."
  },
  {
    kicker: "Next pilot step",
    title: "Use one company, one role, one review workflow.",
    body: "A real pilot can replace the synthetic set with controlled customer data after privacy, consent, and upload storage are ready.",
    proof: "Start small, measure understanding, improve the workflow."
  }
];

export function DemoPresentationPage() {
  const demo = useMemo(() => getDemoTestLabViewModel(), []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState(demo.categorySummaries[0]?.category ?? "Strong frontend evidence");

  const slide = slides[activeSlide];
  const activeSummary = demo.categorySummaries.find((summary) => summary.category === activeCategory) ?? demo.categorySummaries[0];
  const sampleResume = demo.resumes.find((resume) => resume.resumeCategory === activeSummary.category) ?? demo.resumes[0];

  function nextSlide() {
    setActiveSlide((currentSlide) => (currentSlide + 1) % slides.length);
  }

  function previousSlide() {
    setActiveSlide((currentSlide) => (currentSlide - 1 + slides.length) % slides.length);
  }

  return (
    <div className="public-page presentation-page">
      <PublicHeader />
      <main>
        <section className="presentation-stage">
          <div className="presentation-copy">
            <p className="section-kicker">Pilot Demo Slideshow</p>
            <h1>Show the product story in 6 clicks.</h1>
            <p>
              This is the page you can put in front of someone. It explains the product visually, then opens the practical
              60-resume demo and sample evidence report.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/demo-test-lab">
                Open practical demo
              </a>
              <a className="button button-secondary" href="/reports/candidate-evidence">
                View sample evidence report
              </a>
            </div>
          </div>

          <section className="slide-frame" aria-label="Interactive demo slideshow">
            <div className="slide-progress">
              <span>
                Slide {activeSlide + 1} of {slides.length}
              </span>
              <div>
                {slides.map((item, index) => (
                  <button
                    aria-label={`Open slide ${index + 1}: ${item.kicker}`}
                    className={index === activeSlide ? "active" : ""}
                    key={item.kicker}
                    onClick={() => setActiveSlide(index)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <article className="slide-card">
              <p className="section-kicker">{slide.kicker}</p>
              <h2>{slide.title}</h2>
              <p>{slide.body}</p>
              <strong>{slide.proof}</strong>
            </article>
            <div className="slide-controls">
              <button className="button button-secondary" onClick={previousSlide} type="button">
                Previous
              </button>
              <button className="button button-primary" onClick={nextSlide} type="button">
                Next
              </button>
            </div>
          </section>
        </section>

        <section className="presentation-demo-panel">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Practical demo path</p>
              <h2>{demo.companyName}: {demo.jobTitle}</h2>
              <p className="muted">
                Start from a controlled test set, review evidence grouping, then open a sample report. This is a practical
                walkthrough, not a Markdown note.
              </p>
            </div>
            <Badge tone="info">60 synthetic resumes</Badge>
          </div>

          <div className="presentation-metrics">
            {demo.metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="presentation-demo-grid">
          <div className="presentation-category-picker">
            <p className="section-kicker">Click a resume category</p>
            {demo.categorySummaries.map((summary) => (
              <button
                className={summary.category === activeSummary.category ? "active" : ""}
                key={summary.category}
                onClick={() => setActiveCategory(summary.category)}
                type="button"
              >
                <strong>{summary.category}</strong>
                <span>{summary.count} resumes</span>
              </button>
            ))}
          </div>

          <article className="presentation-sample-card">
            <p className="section-kicker">Evidence found</p>
            <h2>{sampleResume.candidateName}</h2>
            <div className="presentation-badge-row">
              <Badge tone="info">{sampleResume.resumeCategory}</Badge>
              <Badge tone="warning">{sampleResume.actualEvidenceLevel}</Badge>
            </div>
            <div className="presentation-evidence-columns">
              <div>
                <h3>Evidence found</h3>
                <ul>
                  {sampleResume.evidenceFound.length > 0 ? (
                    sampleResume.evidenceFound.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No readable evidence found</li>
                  )}
                </ul>
              </div>
              <div>
                <h3>Evidence missing</h3>
                <ul>
                  {sampleResume.evidenceMissing.length > 0 ? (
                    sampleResume.evidenceMissing.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No key evidence missing in this scenario</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="presentation-action-strip">
              <span>Recruiter action</span>
              <strong>{sampleResume.recommendedRecruiterAction}</strong>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
