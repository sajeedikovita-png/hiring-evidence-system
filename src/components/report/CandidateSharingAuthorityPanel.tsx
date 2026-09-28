import React, { useEffect, useState } from "react";
import { candidateSharingAuthorityLabels, CANDIDATE_SHARING_AUTHORITY_TYPES, loadCandidateSharingAuthority, recordCandidateSharingAuthority, revokeCandidateSharingAuthority, type CandidateSharingAuthorityType, type CandidateSharingAuthorityWorkspace } from "../../services/candidateSharingAuthorityService";

export function CandidateSharingAuthorityPanel({ applicationId, onAuthorityChange }: { applicationId: string; onAuthorityChange?: (active: boolean) => void }) {
  const [workspace, setWorkspace] = useState<CandidateSharingAuthorityWorkspace>();
  const [type, setType] = useState<CandidateSharingAuthorityType>("candidate_confirmation");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading sharing authority…");
  async function refresh() {
    const next = await loadCandidateSharingAuthority(applicationId); setWorkspace(next);
    if (next.authority) { setType(next.authority.authorityType); setSource(next.authority.sourceReference); setNote(next.authority.note); }
    onAuthorityChange?.(Boolean(next.authority && !next.authority.revokedAt));
    setMessage("");
  }
  useEffect(() => { let live = true; loadCandidateSharingAuthority(applicationId).then((next) => { if (!live) return; setWorkspace(next); if (next.authority) { setType(next.authority.authorityType); setSource(next.authority.sourceReference); setNote(next.authority.note); } onAuthorityChange?.(Boolean(next.authority && !next.authority.revokedAt)); setMessage(""); }).catch((error) => { if (live) setMessage(error instanceof Error ? error.message : "Sharing authority could not be loaded."); }); return () => { live = false; }; }, [applicationId, onAuthorityChange]);
  const active = Boolean(workspace?.authority && !workspace.authority.revokedAt);
  async function save() { if (!workspace || busy) return; setBusy(true); setMessage(""); try { await recordCandidateSharingAuthority({ applicationId, authorityType: type, sourceReference: source, note, expectedVersion: workspace.authority?.version ?? 0 }); await refresh(); setMessage("Sharing authority recorded. Client-link creation is now available."); } catch (error) { setMessage(error instanceof Error ? error.message : "Sharing authority could not be saved."); } finally { setBusy(false); } }
  async function revoke() { if (!workspace?.authority || busy) return; setBusy(true); setMessage(""); try { await revokeCandidateSharingAuthority({ applicationId, reason, expectedVersion: workspace.authority.version }); setReason(""); await refresh(); setMessage("Sharing authority revoked. Existing client links are unavailable and new links cannot be created."); } catch (error) { setMessage(error instanceof Error ? error.message : "Sharing authority could not be revoked."); } finally { setBusy(false); } }
  return <section className="client-share-controls sharing-authority" aria-labelledby="sharing-authority-heading">
    <h3 id="sharing-authority-heading">Candidate sharing authority</h3>
    <p>Record the company’s documented authority before disclosing this candidate summary. This is separate from authority to upload a CV. Hiring Evidence records the evidence you provide; it does not determine whether sharing is legally permitted.</p>
    {workspace && <>
      <p><strong>Status:</strong> {active ? "Active — client links permitted" : "Not active — client links blocked"}</p>
      <label>Authority basis<select value={type} disabled={!workspace.canEdit || busy} onChange={(event) => setType(event.target.value as CandidateSharingAuthorityType)}>{CANDIDATE_SHARING_AUTHORITY_TYPES.map((value) => <option key={value} value={value}>{candidateSharingAuthorityLabels[value]}</option>)}</select></label>
      <label>Source or reference<input value={source} maxLength={1000} disabled={!workspace.canEdit || busy} onChange={(event) => setSource(event.target.value)} placeholder="Example: Candidate email dated 19 September 2026 confirming client sharing" /></label>
      <label>Internal note (optional)<textarea value={note} maxLength={2000} disabled={!workspace.canEdit || busy} onChange={(event) => setNote(event.target.value)} placeholder="Record scope, limits, or follow-up details" /></label>
      {workspace.canEdit && <button className="button button-primary" type="button" disabled={busy || source.trim().length < 10} onClick={save}>{active ? "Update authority record" : "Record sharing authority"}</button>}
      {active && workspace.canEdit && <div className="sharing-authority-revoke"><label>Reason to revoke<input value={reason} maxLength={1000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Example: Candidate withdrew sharing confirmation" /></label><button className="button button-secondary" type="button" disabled={busy || reason.trim().length < 10} onClick={revoke}>Revoke sharing authority</button></div>}
      {workspace.authority && <p className="muted">Recorded by {workspace.authority.recordedByName} on {new Date(workspace.authority.recordedAt).toLocaleString()} · Version {workspace.authority.version}</p>}
      {workspace.events.length > 0 && <details><summary>Authority history ({workspace.events.length})</summary><ul>{workspace.events.map((event) => <li key={event.id}>{event.action} by {event.actorName} on {new Date(event.createdAt).toLocaleString()}{event.reason ? ` — ${event.reason}` : ""}</li>)}</ul></details>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
