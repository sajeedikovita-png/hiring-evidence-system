import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClientReportShareControls } from "./ClientReportShareControls";
import { CandidateSharingAuthorityPanel } from "./CandidateSharingAuthorityPanel";
import { ClientHandoffDocument } from "./ClientHandoffDocument";
import { createClientHandoff } from "../../services/clientHandoffService";
import { companyReportBranding, loadCompanyConfiguration, type CompanyConfigurationWorkspace } from "../../services/companyConfigurationService";
import type { EvidenceReport } from "../../types/hiring";
import { clientHandoffStyles } from "./clientHandoffStyles";

export function ClientHandoffPreview({ report, syntheticSample = false }: { report: EvidenceReport; syntheticSample?: boolean }) {
  const [open, setOpen] = useState(false);
  const [includeDecision, setIncludeDecision] = useState(false);
  const [preparedAt, setPreparedAt] = useState("");
  const [companyWorkspace, setCompanyWorkspace] = useState<CompanyConfigurationWorkspace>();
  const [sharingAuthorityActive, setSharingAuthorityActive] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (syntheticSample) return;
    let alive = true;
    loadCompanyConfiguration().then((workspace) => { if (alive) setCompanyWorkspace(workspace); }).catch(() => undefined);
    return () => { alive = false; };
  }, [syntheticSample]);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const buttons = Array.from(document.querySelectorAll<HTMLElement>(".client-handoff-overlay button:not(:disabled), .client-handoff-overlay input:not(:disabled), .client-handoff-overlay select:not(:disabled)"));
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", key); previewButton.current?.focus(); };
  }, [open]);
  const summary = createClientHandoff(report, { includeDecision, preparedAt, branding: companyWorkspace ? companyReportBranding(companyWorkspace) : undefined });
  return <>
    <style>{clientHandoffStyles}</style>
    <section className="workspace-card">
      <h2>Prepare a client summary</h2>
      <p>Preview the evidence and questions before printing or saving with your browser. Internal notes, private document links, and audit records are excluded. Review the remaining candidate information before sending it outside your company.</p>
      <button ref={previewButton} className="button button-secondary" onClick={() => { setIncludeDecision(false); setPreparedAt(new Date().toISOString()); setOpen(true); }}>Preview client summary</button>
      <p className="muted">A saved or printed copy cannot be revoked. For controlled access, preview the summary and create an expiring client link.</p>
    </section>
    {open && createPortal(<div className="client-handoff-overlay" role="dialog" aria-modal="true" aria-labelledby="client-handoff-title">
      <div className="client-handoff-controls">
        <div><h2 id="client-handoff-title">Client summary preview</h2><p>Check every finding and confirm you are authorised to share this candidate information.</p></div>
        <button ref={closeButton} className="button button-secondary" onClick={() => setOpen(false)}>Close preview</button>
        <label><input type="checkbox" checked={includeDecision} disabled={report.humanDecision.draft?.status !== "saved"} onChange={(event) => setIncludeDecision(event.target.checked)} /> Include saved human decision and reason</label>
        <button className="button button-primary" onClick={() => window.print()}>Print / save PDF</button>
      </div>
      <ClientHandoffDocument summary={summary} syntheticSample={syntheticSample} />
      {!syntheticSample && <CandidateSharingAuthorityPanel applicationId={report.application.id} onAuthorityChange={setSharingAuthorityActive} />}
      {!syntheticSample && <ClientReportShareControls reportId={report.id} includeDecision={includeDecision} authorityActive={sharingAuthorityActive} />}
    </div>, document.body)}
  </>;
}
