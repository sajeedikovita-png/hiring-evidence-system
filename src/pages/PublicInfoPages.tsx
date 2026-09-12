import React from "react";
import { PublicHeader } from "../components/layout/PublicHeader";

function PublicInfoLayout({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-info-page">
        <header className="public-info-heading">
          <p className="section-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        <article className="public-info-document">{children}</article>
      </main>
      <footer className="public-info-footer">
        <strong>Hiring Evidence</strong>
        <span>AI assists. Human decides. Evidence explains.</span>
        <a href="/request-pilot">Request pilot access</a>
      </footer>
    </div>
  );
}

export function PrivacyNoticePage() {
  return (
    <PublicInfoLayout
      kicker="Public information"
      title="Privacy notice"
      intro="This pilot-stage notice explains what Hiring Evidence System currently collects and how the controlled service handles that information."
    >
      <p className="info-effective">Effective 11 September 2026</p>
      <section><h2>Public pilot requests</h2><p>The request form collects company name, work email, requester role, hiring volume, the first role to review, and an optional note. We use this information to assess the request, prevent duplicate workspace creation, contact the requester, and maintain an access-review record. Do not include candidate information in the public request form.</p></section>
      <section><h2>Company workspace information</h2><p>After approval, the service stores individual account details, company membership, job criteria, candidate documents, evidence records, human decision reasons, and security or audit events needed to operate the workspace. Access is scoped to the approved company.</p></section>
      <section><h2>AI-assisted processing</h2><p>Candidate source text is prepared for review inside the browser. A user must explicitly acknowledge the provider step before reviewed text is sent to the configured AI provider to draft job-related evidence. The output remains subject to human review and does not make the hiring decision.</p></section>
      <section><h2>Service providers and access</h2><p>Infrastructure providers support authentication, database, private storage, application hosting, and the explicitly requested AI-assisted analysis. Platform administrators may access information only when required for approval, support, security, or an audited special-access operation.</p></section>
      <section><h2>Retention and requests</h2><p>Pilot access uses defined access and view-only periods. Some access-request and audit records are retained to protect workspace integrity and document responsible actions. Detailed paid-workspace retention and deletion periods are confirmed in the written customer agreement. For an access, correction, or deletion request, contact the representative handling your pilot or use the pilot request form with the same work email and state “Privacy request” in the note.</p></section>
      <section><h2>Current operating boundary</h2><p>This is a controlled pilot service. This notice describes current product behavior and is not a claim of government endorsement or legal certification. Company customers remain responsible for their employment, candidate-notice, consent, and data-handling obligations.</p></section>
    </PublicInfoLayout>
  );
}

export function PilotTermsPage() {
  return (
    <PublicInfoLayout
      kicker="Commercial information"
      title="Pilot and access terms"
      intro="These public terms describe the current commercial structure. Final access begins only after human review and written agreement with the company."
    >
      <p className="info-effective">Effective 11 September 2026</p>
      <section><h2>Controlled pilot</h2><p>The controlled pilot is S$500 one time for 30 days, one role, up to 50 candidate documents, and two named users. Submitting the public form does not create a charge or activate a workspace.</p></section>
      <section><h2>Founding ongoing access</h2><p>If the company chooses to continue, each of the first three ongoing 30-day terms is S$800. The standard price is S$1,400 per 30-day term from term four. Each term requires manual agreement and platform approval. There is no automatic conversion, renewal, or charge.</p></section>
      <section><h2>Ongoing scope</h2><p>The current ongoing scope supports up to 10 active roles, 500 new candidate documents per 30-day term, and five named users. Additional capacity, support, or services require a separate written scope.</p></section>
      <section><h2>Customer responsibilities</h2><p>The company must provide individual user accounts, keep access details secure, submit only information it is authorised to process, give required notices to candidates, and make every hiring decision through an authorised human reviewer using job-related reasons.</p></section>
      <section><h2>Product boundary</h2><p>Hiring Evidence System organises evidence and prepares review material. It does not rank candidates, make hiring decisions, certify legal compliance, or represent government endorsement. The company remains responsible for its hiring process and final decisions.</p></section>
      <section><h2>Written agreement</h2><p>Availability, support, retention, deletion, cancellation, payment method, taxes, and any company-specific requirements are confirmed before paid access begins. If the written agreement conflicts with this public summary, the signed written agreement controls.</p></section>
    </PublicInfoLayout>
  );
}

export function SingaporeReadinessPage() {
  return (
    <PublicInfoLayout
      kicker="Singapore responsible hiring"
      title="Readiness, not a compliance claim"
      intro="Hiring Evidence System is a controlled review tool. It can help teams keep job-related evidence and human decisions visible, but each company remains responsible for its own employment and data-protection obligations."
    >
      <p className="info-effective">Product position · 11 September 2026</p>
      <section><h2>What the product supports today</h2><p>Teams can define job-related criteria, retain source references for manual evidence findings, record missing evidence and verification needs, restrict workspace access to individual accounts, and record a human decision reason. Private candidate documents use controlled access and short-lived source links.</p></section>
      <section><h2>What the product does not decide</h2><p>The system does not make a hiring decision, certify that protected characteristics were not used, certify fair consideration, or determine whether a company has met any legal or regulatory requirement. Every source claim and output needs human review.</p></section>
      <section><h2>Customer responsibilities</h2><p>Customers must set and apply their own fair-hiring process, decide which job-related criteria are appropriate, assess candidates fairly, provide required candidate notices, establish a lawful basis for personal-data processing, manage retention, and obtain their own legal or HR advice where needed.</p></section>
      <section><h2>Singapore references</h2><p>Use the official guidance for your organisation’s context: <a href="https://www.mom.gov.sg/employment-practices/fair-consideration-framework" target="_blank" rel="noreferrer">MOM Fair Consideration Framework</a>, <a href="https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act/data-protection-obligations" target="_blank" rel="noreferrer">PDPC data protection obligations</a>, and <a href="https://www.imda.gov.sg/about-imda/emerging-technologies-and-research/artificial-intelligence" target="_blank" rel="noreferrer">IMDA responsible AI resources</a>.</p></section>
      <section><h2>Upcoming work</h2><p>Customer-configurable retention, fuller review exports, and additional governance controls are not active product controls today. We will describe scope, limits, and validation evidence before any such feature is offered.</p></section>
      <section><h2>Use in a pilot</h2><p>Before uploading candidate information, nominate the responsible hiring and data-protection contacts, confirm your process for notices and review, and use the system’s record as one input to your own accountable decision process.</p></section>
    </PublicInfoLayout>
  );
}
