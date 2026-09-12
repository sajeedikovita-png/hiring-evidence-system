import React from "react";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import { PublicHeader } from "../components/layout/PublicHeader";
import { EvidenceTrailSketch } from "../components/landing/EvidenceTrailSketch";
import { SampleReportPreview } from "../components/landing/SampleReportPreview";

const workflowSteps = [
  { number: "01", title: "Set the role criteria", description: "Agree the job-related requirements before the team reviews applicants." },
  { number: "02", title: "Trace the evidence", description: "Keep each finding connected to its candidate source and reference." },
  { number: "03", title: "Verify what is missing", description: "Turn unclear claims and evidence gaps into focused interview questions." },
  { number: "04", title: "Write the decision reason", description: "Require the responsible recruiter to record the final human judgment." }
];

const safeguards = [
  ["Decision authority", "The recruiter or hiring manager makes and records the final decision."],
  ["Company access", "Each person uses an individual account connected to one active company workspace."],
  ["Review history", "Decision reasons and controlled access changes remain attributable to a responsible user."]
];

export function LandingPage() {
  return (
    <div className="public-page marketing-page">
      <PublicHeader />
      <main>
        <section className="editorial-hero" id="product">
          <div className="hero-story">
            <p className="section-kicker">For specialist recruitment teams</p>
            <h1>A review record your hiring team can defend.</h1>
            <p className="landing-hero-lede">
              Connect role criteria to source-linked candidate evidence, surface missing proof, prepare verification
              questions, and preserve the human decision reason.
            </p>
            <div className="hero-actions">
              <a className="button button-primary button-large" href="/request-pilot">
                Request the S$500 pilot <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a className="editorial-link" href="/reports/candidate-evidence">Read the synthetic report</a>
            </div>
            <dl className="hero-facts" aria-label="Product operating facts">
              <div><dt>Decision</dt><dd>Human review required</dd></div>
              <div><dt>Evidence</dt><dd>Sources remain visible</dd></div>
              <div><dt>Billing</dt><dd>No automatic charge</dd></div>
            </dl>
            <figure className="hero-reviewer-sketch">
              <figcaption><span>Human judgment</span><strong>Stays in the room.</strong></figcaption>
              <img src="/illustrations/recruiter-review-sketch.png" alt="Hand-drawn recruiter reviewing candidate evidence" />
            </figure>
          </div>
          <div className="hero-evidence-visual">
            <EvidenceTrailSketch />
            <SampleReportPreview />
          </div>
        </section>

        <div className="editorial-strap" aria-label="Product principle">
          <span>AI assists</span><span>Evidence explains</span><span>Human decides</span>
        </div>

        <section className="editorial-section method-section" id="how-it-works">
          <header className="editorial-section-heading">
            <p className="section-kicker">The review method</p>
            <h2>One traceable line from requirement to decision.</h2>
            <p>The product prepares a structured file for inspection. It does not rank candidates or replace the team’s judgment.</p>
          </header>
          <div className="method-ledger">
            {workflowSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="editorial-section evidence-section" id="sample-report">
          <div className="evidence-section-title">
            <p className="section-kicker">What the team can inspect</p>
            <h2>The reasoning stays beside the source.</h2>
          </div>
          <div className="evidence-article">
            <p className="evidence-dropcap">A</p>
            <p>role criterion is only the beginning. The review record shows where evidence was found, what remains uncertain, which question should be asked, and who recorded the final reason.</p>
          </div>
          <ol className="evidence-index">
            <li><span>01</span>Role criteria and priorities</li>
            <li><span>02</span>Source-linked candidate evidence</li>
            <li><span>03</span>Missing and unclear proof</li>
            <li><span>04</span>Suggested verification questions</li>
            <li><span>05</span>Recruiter notes and decision history</li>
          </ol>
          <a className="editorial-link evidence-report-link" href="/reports/candidate-evidence">Open the complete synthetic report <ArrowRight size={16} aria-hidden="true" /></a>
        </section>

        <section className="editorial-section safeguards-section" id="safeguards">
          <header className="editorial-section-heading compact-heading">
            <p className="section-kicker">Operating safeguards</p>
            <h2>Responsibility remains visible.</h2>
          </header>
          <div className="safeguard-ledger">
            {safeguards.map(([title, description], index) => (
              <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
          <p className="operating-boundary"><strong>Product boundary.</strong> Hiring Evidence System supports evidence review. It does not certify legal compliance or make hiring decisions.</p>
        </section>

        <section className="singapore-readiness-callout" aria-labelledby="singapore-readiness-title">
          <div><p className="section-kicker">Singapore responsible hiring</p><h2 id="singapore-readiness-title">A readiness record is not a compliance certificate.</h2></div>
          <div><p>See the controls available today, the responsibilities that remain with each employer, and the official MOM, PDPC, and IMDA resources that should inform your process.</p><a className="editorial-link" href="/singapore-readiness">Read Singapore readiness</a></div>
        </section>

        <section className="editorial-section offer-section" id="pilot-offer">
          <header className="editorial-section-heading">
            <p className="section-kicker">Commercial access</p>
            <h2>Begin with one controlled role.</h2>
            <p>Access is manually reviewed. A request does not create a charge or activate a workspace.</p>
          </header>
          <div className="offer-ledger">
            <article className="offer-row offer-row-primary">
              <div><p className="offer-number">01 / Controlled pilot</p><h3>S$500 <span>one time</span></h3></div>
              <p>30 days · one role · up to 50 candidate documents · two named users</p>
              <a className="button button-primary" href="/request-pilot">Request pilot access</a>
            </article>
            <article className="offer-row">
              <div><p className="offer-number">02 / Founding company access</p><h3>S$800 <span>per 30-day term</span></h3></div>
              <p>Terms one to three · up to 10 active roles · 500 new documents · five named users</p>
              <a className="editorial-link" href="/request-pilot">Discuss ongoing access</a>
            </article>
            <p className="standard-price-note"><strong>Standard price from term four: S$1,400 per 30-day term.</strong> Every renewal requires manual agreement. No automatic renewal or charge.</p>
          </div>
          <div className="access-policy-strip" id="company-access">
            <span><strong>One email, one person</strong> Individual accounts keep review activity attributable.</span>
            <span><strong>One active company per user</strong> Additional employees join the existing company workspace.</span>
            <span><strong>Controlled exceptions</strong> Transfers require an administrator, written reason, and audit record.</span>
          </div>
        </section>

        <section className="landing-final-cta">
          <div><p className="section-kicker">Pilot access</p><h2>Put one real review through the complete evidence workflow.</h2></div>
          <div><p>S$500 one-time for a controlled 30-day pilot. Every request is reviewed by a person before access is approved.</p><a className="button button-primary" href="/request-pilot">Request the pilot <ArrowRight size={17} aria-hidden="true" /></a></div>
        </section>
      </main>
      <footer className="public-footer">
        <div className="public-footer-inner">
          <div><strong>Hiring Evidence</strong><p>Evidence-led candidate review for accountable hiring teams.</p></div>
          <div className="public-footer-links"><a href="/#how-it-works">Method</a><a href="/reports/candidate-evidence">Sample report</a><a href="/singapore-readiness">Singapore readiness</a><a href="/privacy">Privacy</a><a href="/pilot-terms">Pilot terms</a><a href="/login">Sign in</a></div>
          <p className="public-footer-note">AI assists. Human decides. Evidence explains.</p>
        </div>
      </footer>
    </div>
  );
}
