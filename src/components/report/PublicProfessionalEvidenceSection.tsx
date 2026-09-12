import React, { useEffect, useState } from "react";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import SearchCheck from "lucide-react/dist/esm/icons/search-check.js";
import { analyzePublicEvidence, listPublicEvidence, type PublicEvidenceSource } from "../../services/publicEvidenceService";
import { createHiringSupabaseClient } from "../../services/supabaseClient";

const sourceLabels: Record<string, string> = {
  linkedin: "LinkedIn profile",
  github: "GitHub",
  portfolio: "Portfolio",
  app_store: "App Store",
  play_store: "Google Play",
  publication: "Publication",
  other: "Other public source"
};

type Props = { reportId: string; readOnly?: boolean };

export function PublicProfessionalEvidenceSection({ reportId, readOnly = false }: Props) {
  const [sources, setSources] = useState<PublicEvidenceSource[]>([]);
  const [sourceType, setSourceType] = useState("linkedin");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [candidateConfirmed, setCandidateConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (readOnly) return;
    try { setSources(await listPublicEvidence(createHiringSupabaseClient(), reportId)); }
    catch { setMessage("Public evidence is unavailable at the moment."); }
  }

  useEffect(() => { void refresh(); }, [reportId, readOnly]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await analyzePublicEvidence(createHiringSupabaseClient(), { reportId, sourceType, sourceUrl, sourceTitle, sourceExcerpt, candidateConfirmed });
      setSourceUrl(""); setSourceTitle(""); setSourceExcerpt(""); setCandidateConfirmed(false);
      await refresh();
      setMessage("Public evidence compared. Verify every finding before using it in a decision.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Public evidence analysis failed.");
    } finally { setBusy(false); }
  }

  return (
    <section className="workspace-card public-evidence-panel" aria-labelledby="public-evidence-title">
      <header className="public-evidence-heading">
        <div>
          <p className="section-kicker">Public professional evidence</p>
          <h2 id="public-evidence-title">Connect candidate claims to inspectable work</h2>
          <p>Compare candidate-confirmed professional sources with the role criteria and uploaded evidence.</p>
        </div>
        <SearchCheck size={32} aria-hidden="true" />
      </header>

      <div className="public-evidence-boundary">
        <strong>Human verification required.</strong> This tool organises job-related information. It does not search by name, scrape profiles, rank candidates, or make the hiring decision.
      </div>

      {readOnly ? (
        <article className="public-evidence-result">
          <div className="public-evidence-result-title"><div><span>Example · Portfolio</span><h3>Candidate-confirmed product portfolio</h3></div><span className="evidence-status">Needs verification</span></div>
          <p>A public case study may add delivery context to a claim in the resume. The recruiter would open the source, confirm authorship and dates, and ask a focused verification question.</p>
          <p className="public-evidence-disclosure">AI-organised public evidence. Human verification and decision required.</p>
        </article>
      ) : (
        <form className="public-evidence-form" onSubmit={submit}>
          <div className="public-evidence-fields">
            <label>Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Source title<input required maxLength={180} value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="Candidate's mobile app portfolio" /></label>
          </div>
          <label>Public source URL<input required type="url" maxLength={1000} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>
          <label>Relevant public text<textarea required minLength={20} maxLength={8000} value={sourceExcerpt} onChange={(event) => setSourceExcerpt(event.target.value)} placeholder="Paste only the job-related text that the recruiter can inspect at this public link." /></label>
          <p className="public-evidence-helper">Do not add photographs, social activity, private data, health information, family information, or other details unrelated to the role. The pasted text is removed after analysis.</p>
          <label className="public-evidence-confirm"><input type="checkbox" checked={candidateConfirmed} onChange={(event) => setCandidateConfirmed(event.target.checked)} required /><span>The candidate supplied or confirmed this link, and our organisation is authorised to use this job-related information.</span></label>
          <div className="public-evidence-submit"><button className="button button-primary" disabled={busy || !candidateConfirmed} type="submit">{busy ? "Comparing evidence..." : "Compare public evidence"}</button>{message ? <p role="status">{message}</p> : null}</div>
        </form>
      )}

      {sources.map((source) => (
        <article className="public-evidence-result" key={source.id}>
          <div className="public-evidence-result-title">
            <div><span>{sourceLabels[source.sourceType] ?? "Public source"}</span><h3>{source.sourceTitle}</h3></div>
            <a className="table-link" href={source.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
          <p>{source.summary}</p>
          {source.requirementLinks.length ? <div className="public-evidence-findings"><h4>Links to role criteria</h4>{source.requirementLinks.map((item) => <div key={item.criteriaId}><strong>{item.status}</strong><p>{item.finding}</p><small>Verify: {item.verificationNeeded}</small></div>)}</div> : null}
          {source.additionalFacts.length ? <div><h4>Additional job-related facts</h4><ul className="evidence-list">{source.additionalFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div> : null}
          {source.verificationQuestions.length ? <div><h4>Questions to ask</h4><ol className="evidence-list numbered">{source.verificationQuestions.map((question) => <li key={question}>{question}</li>)}</ol></div> : null}
          <p className="public-evidence-disclosure">AI-organised public evidence. Human verification and decision required.</p>
        </article>
      ))}
    </section>
  );
}
