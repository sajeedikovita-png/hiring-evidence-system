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

const connectionSteps = [
  { number: "01", title: "Client brief", description: "Agree the specific experience, skills, and proof the role requires." },
  { number: "02", title: "Candidate evidence", description: "Connect each requirement to the resume source, public work, or a visible evidence gap." },
  { number: "03", title: "Recruiter handoff", description: "Present a focused profile with clear reasons and questions the client can inspect." },
  { number: "04", title: "Human decision", description: "The hiring company reviews the evidence and makes the final judgment." }
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
            <h1>Connect every client requirement to evidence they can inspect.</h1>
            <p className="landing-hero-lede">
              Turn a company&apos;s specific role brief into a traceable candidate review. Show where job-related evidence
              was found, what still needs verification, and why a profile is being presented for human review.
            </p>
            <p className="landing-positioning-line">
              Already using recruiting software? Keep it for sourcing, scheduling, and offers. Use Hiring Evidence
              alongside it to inspect job-related evidence and prepare a clearer client conversation. Upload documents
              separately; a direct connection to your recruiting platform is not included.
            </p>
            <div className="hero-actions">
              <a className="button button-primary button-large" href="/request-pilot">
                Request a free role conversation <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a className="editorial-link" href="#product-walkthrough">Watch the short walkthrough</a>
            </div>
            <dl className="hero-facts" aria-label="Product operating facts">
              <div><dt>Decision</dt><dd>Human review required</dd></div>
              <div><dt>Evidence</dt><dd>Sources remain visible</dd></div>
              <div><dt>Billing</dt><dd>No automatic charge</dd></div>
            </dl>
          </div>
          <div className="hero-evidence-visual">
            <EvidenceTrailSketch />
            <SampleReportPreview />
            <figure className="hero-reviewer-sketch">
              <figcaption><span>Human judgment</span><strong>Stays in the room.</strong></figcaption>
              <img src="/illustrations/recruiter-review-sketch.png" alt="Hand-drawn recruiter reviewing candidate evidence" />
            </figure>
          </div>
        </section>

        <div className="editorial-strap" aria-label="Product principle">
          <span>AI assists</span><span>Evidence explains</span><span>Human decides</span>
        </div>

        <section className="product-walkthrough-section" id="product-walkthrough" aria-labelledby="product-walkthrough-title">
          <div className="product-walkthrough-copy">
            <p className="section-kicker">See the workflow before paying</p>
            <h2 id="product-walkthrough-title">Follow one role from client brief to human decision.</h2>
            <p>
              This short overview uses fictional candidate information. See how a requirement stays connected
              to its source evidence, an unanswered question, and the recruiter&apos;s recorded reason.
            </p>
            <div className="product-walkthrough-actions">
              <a className="button button-primary" href="/request-pilot">Discuss one role for free</a>
              <a className="editorial-link" href="/reports/candidate-evidence">Read the synthetic report</a>
              <a className="editorial-link" href="/media/hiring-evidence-detailed-walkthrough-149.mp4">Watch the detailed walkthrough (8 min 44 sec)</a>
            </div>
            <small>Free first conversation · Synthetic information only · No charge or workspace activation</small>
          </div>
          <div className="product-walkthrough-video">
            <video
              aria-label="Short Hiring Evidence product walkthrough"
              controls
              playsInline
              poster="/media/hiring-evidence-sales-overview-poster.jpg"
              preload="metadata"
            >
              <source src="/media/hiring-evidence-sales-overview.mp4" type="video/mp4" />
              Your browser cannot play this video. Open the synthetic report to review the workflow.
            </video>
          </div>
        </section>

        <section className="client-connection-feature" aria-labelledby="client-connection-title">
          <header className="client-connection-heading">
            <p className="section-kicker">The recruiter-to-client connection</p>
            <h2 id="client-connection-title">Turn a client brief into a clear candidate story.</h2>
            <p>
              Move beyond a general CV handoff. Keep the company&apos;s requirements connected to the candidate&apos;s
              evidence, so clients can see the basis for further review and the questions that still need answers.
            </p>
          </header>
          <ol className="client-connection-flow">
            {connectionSteps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div><strong>{step.title}</strong><p>{step.description}</p></div>
              </li>
            ))}
          </ol>
          <div className="client-connection-outcomes">
            <p><strong>For the recruiter</strong> Present focused profiles with an evidence trail that strengthens the client conversation.</p>
            <p><strong>For the hiring company</strong> Review role-related proof, visible gaps, and verification questions before making a decision.</p>
          </div>
        </section>

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

        <section className="editorial-section public-source-feature" aria-labelledby="public-source-title">
          <div className="public-source-intro">
            <p className="section-kicker">Candidate-confirmed public evidence</p>
            <h2 id="public-source-title">See the work behind a professional claim.</h2>
            <p>Bring a candidate-confirmed LinkedIn profile, GitHub page, portfolio, app listing, or publication into the same evidence record as the resume.</p>
          </div>
          <div className="public-source-ledger">
            <article><span>01</span><h3>Connect</h3><p>Add the public link and only the job-related text the recruiter can inspect.</p></article>
            <article><span>02</span><h3>Compare</h3><p>See supporting evidence, different information, and useful facts beside the role criteria.</p></article>
            <article><span>03</span><h3>Verify</h3><p>Open the original source, confirm the details with the candidate, and record the human judgment.</p></article>
          </div>
          <p className="public-source-boundary"><strong>Designed for responsible review:</strong> no name search, automated profile scraping, candidate ranking, or automated hiring decision.</p>
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
            <h2>One clear price from the first paid term.</h2>
            <p>Access is manually reviewed. A request does not create a charge or activate a workspace.</p>
          </header>
          <div className="offer-ledger">
            <article className="offer-row offer-row-primary">
              <div><p className="offer-number">01 / Company access</p><h3>S$149 <span>per 30-day term</span></h3></div>
              <p>Including the first paid pilot term · two active roles · 50 new candidate documents per term · two named users · one initial 30-minute setup session · email support</p>
              <a className="button button-primary" href="/request-pilot">Discuss company access</a>
            </article>
            <article className="offer-row">
              <div><p className="offer-number">02 / Company-specific work</p><h3>Separate <span>written quote</span></h3></div>
              <p>Discuss a report format, workflow, or integration requirement. Feasibility, scope, delivery, and any maintenance costs are agreed before development. Custom development is not included in access.</p>
              <a className="editorial-link" href="/request-pilot">Discuss a requirement</a>
            </article>
            <p className="standard-price-note"><strong>No mandatory setup fee or annual contract. No automatic renewal or charge.</strong> Each renewal requires manual agreement. The first five paying companies can keep the S$149 price for 12 months within this scope; eligibility and the price-protection end date are confirmed in writing before payment. Additional capacity requires a separate agreement, with no hidden overage charges.</p>
          </div>
          <div className="access-policy-strip" id="company-access">
            <span><strong>One email, one person</strong> Individual accounts keep review activity attributable.</span>
            <span><strong>One active company per user</strong> Additional employees join the existing company workspace.</span>
            <span><strong>Controlled exceptions</strong> Transfers require an administrator, written reason, and audit record.</span>
          </div>
        </section>

        <section className="landing-final-cta">
          <div><p className="section-kicker">Pilot access</p><h2>Put one real review through the complete evidence workflow.</h2></div>
          <div><p>S$149 per company per 30-day term, including the first paid term. See a fictional example in a free conversation before deciding. Every request is reviewed by a person.</p><a className="button button-primary" href="/request-pilot">Discuss the S$149 plan <ArrowRight size={17} aria-hidden="true" /></a></div>
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
