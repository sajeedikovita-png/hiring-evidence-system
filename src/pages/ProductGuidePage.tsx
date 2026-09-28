import React from "react";
import { Link } from "react-router-dom";
import { PublicHeader } from "../components/layout/PublicHeader";
import { getProductGuideContent, type ProductGuidePageKey } from "../services/productGuideContent";

export function ProductGuidePage({ page }: { page: ProductGuidePageKey }) {
  const content = getProductGuideContent(page);
  return <div className="public-page product-guide-page">
    <PublicHeader />
    <main className="product-guide-main" id="main-content">
      <header className="product-guide-heading">
        <div>
        <p className="section-kicker">{content.kicker}</p>
        <h1>{content.title}</h1>
        <p className="product-guide-introduction">{content.introduction}</p>
        <div className="product-guide-actions">
          <Link className="button button-primary" to="/request-pilot">Discuss one role for free</Link>
          <Link className="editorial-link" to="/reports/candidate-evidence">Inspect the sample report</Link>
        </div>
        <p className="product-guide-disclosure">AI-assisted review · Human decision and reason required</p>
        </div>
        <figure className="product-guide-sketch"><img src="/illustrations/recruiter-review-sketch.png" alt="Hand-drawn recruiter inspecting the evidence" /><figcaption>Evidence explains. Human decides.</figcaption></figure>
      </header>
      <section className="product-guide-process" aria-labelledby="guide-process-title">
        <div className="product-guide-section-heading"><p className="section-kicker">The review process</p><h2 id="guide-process-title">{content.outcome}</h2></div>
        <ol>{content.steps.map((step, index) => <li key={step.title}><span className="product-guide-number" aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3><p>{step.detail}</p></li>)}</ol>
      </section>
      <section className="product-guide-example" aria-labelledby="guide-example-title">
        <div><p className="section-kicker">A worked example</p><h2 id="guide-example-title">{content.example.role}</h2><p>Synthetic material for explanation. This is not a candidate assessment.</p></div>
        <dl>
          <div><dt>Role requirement</dt><dd>{content.example.requirement}</dd></div>
          <div><dt>Source statement</dt><dd>{content.example.source}</dd></div>
          <div><dt>Needs verification</dt><dd>{content.example.gap}</dd></div>
          <div><dt>Useful next question</dt><dd>{content.example.question}</dd></div>
        </dl>
      </section>
      <div className="product-guide-notes">{content.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}</div>
      <section className="product-guide-faq" aria-labelledby="guide-faq-title"><p className="section-kicker">Practical questions</p><h2 id="guide-faq-title">Before you begin</h2>{content.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
      <section className="product-guide-cta" aria-labelledby="guide-cta-title"><div><p className="section-kicker">Start with your role</p><h2 id="guide-cta-title">See whether this fits your review process.</h2><p>Bring a role brief. We can walk through synthetic evidence before you decide about company access.</p><small>Do not include candidate information in the public request.</small></div><div className="product-guide-actions"><Link className="button button-primary" to="/request-pilot">Request a free role conversation</Link><Link className="editorial-link" to="/pilot-terms">Read access scope and terms</Link></div></section>
    </main>
    <footer className="public-info-footer"><strong>Hiring Evidence</strong><span>AI assists. Human decides. Evidence explains.</span><Link to="/resources">Review resources</Link><Link to="/singapore-readiness">Singapore readiness</Link><Link to="/privacy">Privacy notice</Link><Link to="/pilot-terms">Terms</Link></footer>
  </div>;
}
