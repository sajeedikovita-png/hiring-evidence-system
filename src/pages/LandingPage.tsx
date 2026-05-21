import React from "react";
import { Button } from "../../components/ui/Button";
import { PublicHeader } from "../components/layout/PublicHeader";
import { SampleReportPreview } from "../components/landing/SampleReportPreview";
import { landingFeatures } from "../data/mockHiringData";

const steps = [
  "Create the job criteria",
  "Collect candidate evidence",
  "Review missing proof and fairness checks",
  "Record the human decision reason"
];

export function LandingPage() {
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="section-kicker">Hiring Evidence System</p>
            <h1>Hire with evidence, not guesswork.</h1>
            <p>
              An evidence-based hiring review platform that helps recruiters understand candidate suitability, missing proof,
              interview questions, and fairness risks before making a human decision.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/reports/candidate-evidence">
                View sample report
              </a>
              <Button variant="secondary">Request pilot access</Button>
            </div>
          </div>
          <SampleReportPreview />
        </section>

        <section className="landing-section dark-band" id="problem">
          <div>
            <p className="section-kicker">Problem</p>
            <h2>Hiring reviews are often hard to explain after the fact.</h2>
          </div>
          <div className="problem-grid">
            <p>Recruiters need clearer links between role requirements and candidate evidence.</p>
            <p>Hiring teams need to see missing proof before they make a decision.</p>
            <p>Companies need safer decision notes grounded in job-related criteria.</p>
          </div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">How it works</p>
              <h2>AI assists the evidence review. Humans decide.</h2>
            </div>
          </div>
          <div className="step-grid">
            {steps.map((step, index) => (
              <article key={step} className="step-card">
                <span>{index + 1}</span>
                <h3>{step}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <p className="section-kicker">Product features</p>
          <h2>Everything points back to job-related evidence.</h2>
          <div className="feature-grid">
            {landingFeatures.map((feature) => (
              <article key={feature} className="feature-card">
                <h3>{feature}</h3>
                <p>Structured, reviewable, and written for recruiter judgment rather than automated outcomes.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section sample-band" id="sample-report">
          <div>
            <p className="section-kicker">Sample report</p>
            <h2>A recruiter can see evidence, gaps, and verification questions quickly.</h2>
            <p className="muted">Every report includes the reminder: AI-assisted analysis. Human review is required before making any hiring decision.</p>
          </div>
          <SampleReportPreview />
        </section>

        <section className="landing-section trust-section">
          <p className="section-kicker">Human-led hiring</p>
          <h2>Built to support recruiters, not replace them.</h2>
          <p>
            The system helps organize evidence, fairness checks, and decision notes. It does not select, reject, rank, or
            place candidates.
          </p>
        </section>

        <section className="landing-final-cta">
          <p className="section-kicker">Pilot access</p>
          <h2>Start with one role and one evidence review workflow.</h2>
          <div className="hero-actions">
            <a className="button button-primary" href="/dashboard">
              Request pilot access
            </a>
            <a className="button button-secondary" href="/reports/candidate-evidence">
              View sample report
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
