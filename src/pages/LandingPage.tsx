import React from "react";
import { ShieldCheck, Scale, Search, ArrowRight, Check } from "lucide-react";
import { PublicHeader } from "../components/layout/PublicHeader";
import { SampleReportPreview } from "../components/landing/SampleReportPreview";

const heroMeta = [
  { strong: "Human decides", rest: "always" },
  { strong: "PDPA-aware", rest: "data handling" },
  { strong: "Full", rest: "audit trail" }
];

const steps = [
  {
    title: "Set the job criteria",
    body: "Paste the job description. The system drafts job-related requirements to review and edit."
  },
  {
    title: "Collect evidence",
    body: "Share an application link. Candidates add resume, links, and answers with consent."
  },
  {
    title: "Review proof & fairness",
    body: "Read matches, missing proof, verification questions, and a fairness check."
  },
  {
    title: "Record the decision",
    body: "Enter the decision with a job-related reason. Saved to an audit trail."
  }
];

const ledger = [
  { figure: "100%", label: "Decisions carry a human reason" },
  { figure: "00", label: "Auto-rejections, ever" },
  { figure: "03m", label: "Resume to evidence report" },
  { figure: "FULL", label: "Exportable audit trail" }
];

const problems = [
  {
    idx: "A.",
    title: "You can't explain the score",
    body: "A black-box ranking is hard to justify to a hiring manager or a client who wants a reason."
  },
  {
    idx: "B.",
    title: "Rejected people ask questions",
    body: "Candidates and clients increasingly expect a clear, job-related reason for a decision."
  },
  {
    idx: "C.",
    title: "Fair-hiring rules apply",
    body: "TAFEP fair-hiring guidelines and PDPA expectations sit on every hiring decision you make."
  }
];

const pillars = [
  {
    n: "2.1",
    icon: ShieldCheck,
    title: "Defensible by default",
    body: "Every decision carries the evidence behind it, a human-written reason, and an audit trail. When anyone asks why, you have the record."
  },
  {
    n: "2.2",
    icon: Scale,
    title: "Fairness-aware review",
    body: "The system flags risky or unfair decision wording before it is recorded, tied to job-related criteria. It never selects, rejects, or ranks."
  },
  {
    n: "2.3",
    icon: Search,
    title: "Evidence, not a verdict",
    body: "See what a candidate has proven, what proof is missing, and exactly what to verify in the interview. The recruiter controls the outcome."
  }
];

const matrixRows = [
  { req: "5+ yrs backend", src: "Resume · 2 roles", chip: { cls: "found", label: "Found" } },
  { req: "AWS deployment", src: "Questionnaire", chip: { cls: "verify", label: "Verify" } },
  { req: "Team leadership", src: "Not provided", chip: { cls: "missing", label: "Missing" } },
  { req: "CI / CD ownership", src: "Resume · project", chip: { cls: "found", label: "Found" } }
];

const compliancePoints = [
  "Consent captured before any candidate data is reviewed",
  "Decision wording checked against fair-hiring language",
  "A human reason is required for every recorded decision",
  "Every step saved to an exportable audit trail"
];

export function LandingPage() {
  return (
    <div className="public-page landing-v2">
      <PublicHeader />
      <main>
        {/* HERO */}
        <section>
          <div className="wrap hero">
            <div className="hero-l">
              <span className="tag">[ Evidence-led hiring · Singapore ]</span>
              <h1>
                Evidence
                <br />
                over
                <br />
                <span className="accent">opinion.</span>
              </h1>
              <p className="lede">
                A job description and a resume become one clear record: what the candidate has
                proven, what is missing, and what to verify. Your team makes a fair, documented,
                human decision, not a black-box score.
              </p>
              <div className="hero-actions">
                <a className="btn btn-lime" href="/request-pilot">
                  Request pilot access <ArrowRight size={17} />
                </a>
                <a className="link-underline" href="/reports/candidate-evidence">
                  View a sample report
                </a>
              </div>
              <div className="hero-meta">
                {heroMeta.map((meta) => (
                  <span key={meta.strong}>
                    <b>{meta.strong}</b> · {meta.rest}
                  </span>
                ))}
              </div>
            </div>
            <div className="hero-r">
              <SampleReportPreview />
            </div>
          </div>
        </section>

        {/* PROCESS STRIP */}
        <section id="how">
          <div className="wrap" style={{ padding: 0 }}>
            <div className="stepstrip">
              {steps.map((step, index) => (
                <div key={step.title}>
                  <div className="n">{String(index + 1).padStart(2, "0")}</div>
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STAT LEDGER */}
        <section>
          <div className="wrap" style={{ padding: 0 }}>
            <div className="ledger">
              {ledger.map((stat) => (
                <div key={stat.label}>
                  <b>{stat.figure}</b>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section>
          <div className="wrap sec" id="problem">
            <div className="sec-head">
              <div className="sec-num">01 / PROBLEM</div>
              <div>
                <h2>AI that scores candidates can&rsquo;t tell you why.</h2>
                <p className="sub">
                  Most hiring tools hand you a number and hope no one asks how it got there. That is
                  a risk recruiters carry, not the software.
                </p>
              </div>
            </div>
            <div className="rows">
              {problems.map((problem) => (
                <div className="row3" key={problem.idx}>
                  <div className="idx">{problem.idx}</div>
                  <h3>{problem.title}</h3>
                  <p>{problem.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY / PILLARS */}
        <section>
          <div className="wrap sec">
            <div className="sec-head">
              <div className="sec-num">02 / WHY</div>
              <div>
                <h2>Decisions you can stand behind.</h2>
              </div>
            </div>
            <div className="cols3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.n}>
                    <div className="n">{pillar.n}</div>
                    <div className="pic" aria-hidden="true">
                      <Icon size={22} />
                    </div>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* OUTPUT / REPORT */}
        <section>
          <div className="wrap sec" id="report">
            <div className="sec-head">
              <div className="sec-num">03 / OUTPUT</div>
              <div>
                <h2>One evidence report your team can use.</h2>
                <p className="sub">
                  Evidence matched to the role, gaps to verify, suggested interview questions, and a
                  fairness check, with a human decision recorded at the end.
                </p>
              </div>
            </div>
            <div className="report-grid">
              <div className="report-copy">
                <h3>The evidence matrix</h3>
                <p>
                  Each requirement is mapped to the proof behind it and a clear status. Nothing is
                  decided for you, it is laid out so a person can decide well.
                </p>
                <div className="hero-actions">
                  <a className="btn btn-emerald" href="/reports/candidate-evidence">
                    Open the sample report
                  </a>
                  <a className="link-underline" href="/demo-presentation">
                    Watch the demo
                  </a>
                </div>
              </div>
              <div>
                <table className="matrix">
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Evidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row) => (
                      <tr key={row.req}>
                        <td>
                          <b>{row.req}</b>
                        </td>
                        <td className="src">{row.src}</td>
                        <td>
                          <span className={`chip ${row.chip.cls}`}>{row.chip.label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE */}
        <section className="dark">
          <div className="wrap sec" id="compliance">
            <div className="sec-head">
              <div className="sec-num">04 / COMPLIANCE</div>
              <div>
                <h2>Compliance is the headline, not the fine print.</h2>
                <p className="sub">Built for Singapore hiring.</p>
              </div>
            </div>
            <ul className="comp-list">
              {compliancePoints.map((point) => (
                <li key={point}>
                  <span className="ck">[✓]</span> {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FINAL CTA */}
        <section>
          <div className="wrap sec final" id="cta">
            <span className="tag">[ Pilot access ]</span>
            <h2 style={{ marginTop: 18 }}>
              Start with
              <br />
              one <span className="accent">role.</span>
            </h2>
            <p>
              Run a controlled pilot on a single job. See the evidence report, the fairness check,
              and the audit trail on your own candidates before you commit to anything.
            </p>
            <div className="hero-actions">
              <a className="btn btn-lime" href="/request-pilot">
                Request pilot access <ArrowRight size={17} />
              </a>
              <a className="link-underline" href="/reports/candidate-evidence">
                View a sample report
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot">
          <div className="foot-row">
            <div className="foot-brand">
              <span className="foot-mark" aria-hidden="true">
                <Check size={15} strokeWidth={2.6} />
              </span>
              Hiring Evidence System
            </div>
            <div className="foot-links">
              <a href="/login">Login</a>
              <a href="/request-pilot">Request pilot</a>
              <a href="/reports/candidate-evidence">Sample report</a>
            </div>
          </div>
          <p className="foot-note">
            AI-assisted analysis. Human review is required before any hiring decision. The system
            does not select, reject, or rank candidates. It surfaces job-related evidence to support
            a documented human decision.
          </p>
        </div>
      </footer>
    </div>
  );
}
