import React, { useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { PublicHeader } from "../components/layout/PublicHeader";
import { getDemoTestLabViewModel } from "../services/demoTestLabService";

const slides = [
  {
    kicker: "The connection",
    title: "Connect the client brief to evidence in each profile.",
    body: "Hiring Evidence keeps every specific role requirement beside source-linked candidate evidence, missing proof, and the next verification question.",
    proof: "From client requirement to evidence the hiring company can inspect."
  },
  {
    kicker: "Recruiter value",
    title: "Present focused profiles with a clear reason.",
    body: "Instead of a general CV handoff, show how the job-related evidence connects to the brief and what still needs checking.",
    proof: "A stronger, more transparent client conversation."
  },
  {
    kicker: "Evidence connection",
    title: "The system shows evidence found and evidence missing.",
    body: "Every finding stays connected to a role requirement and its candidate source. Recruiters can inspect the reason instead of trusting a black box.",
    proof: "Good evidence, verification needed. Human review required."
  },
  {
    kicker: "Practical review",
    title: "Recruiters inspect the report before any decision.",
    body: "The report shows requirement evidence, missing evidence, fairness wording checks, and suggested verification questions.",
    proof: "Decision reason required."
  },
  {
    kicker: "Client confidence",
    title: "The hiring company can inspect the basis for review.",
    body: "The report makes supporting evidence, uncertain claims, and open questions visible before the company makes its own decision.",
    proof: "Evidence report ready. Human review required."
  },
  {
    kicker: "Next pilot step",
    title: "Start with a free conversation, then S$149 per 30-day term.",
    body: "Including the first paid term: two active roles, 50 new candidate documents per term, and two users. One initial 30-minute setup session and email support are included. Renew manually, with no annual contract or mandatory setup fee.",
    proof: "Company-specific development requires a separate written quote."
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
            <p className="section-kicker">Product discovery</p>
            <h1>Show the recruiter-to-client value in 6 clicks.</h1>
            <p>
              See how a specific company requirement stays connected to candidate evidence, a focused recruiter handoff,
              and the hiring company&apos;s final human decision. Keep your existing recruiting software; upload
              documents here separately for evidence review. A direct connection to your recruiting platform is not included.
            </p>
            <ol className="presentation-connection-flow" aria-label="Client requirement to human decision">
              <li><span>01</span><strong>Client requirement</strong></li>
              <li><span>02</span><strong>Candidate evidence</strong></li>
              <li><span>03</span><strong>Recruiter handoff</strong></li>
              <li><span>04</span><strong>Human decision</strong></li>
            </ol>
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
