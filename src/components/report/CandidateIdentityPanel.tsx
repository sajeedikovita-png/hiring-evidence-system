import React, { useEffect, useState } from "react";
import { loadCandidateIdentity, recordCandidateIdentity, type CandidateIdentityWorkspace } from "../../services/candidateIdentityService";

export function CandidateIdentityPanel({ applicationId, onSaved }: { applicationId: string; onSaved?: (name: string) => Promise<void> | void }) {
  const [workspace, setWorkspace] = useState<CandidateIdentityWorkspace>();
  const [name, setName] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("Loading candidate identity…");
  useEffect(() => { let live = true; loadCandidateIdentity(applicationId).then((next) => { if (!live) return; setWorkspace(next); setName(next.recordedName); setMessage(""); }).catch((error) => { if (live) setMessage(error instanceof Error ? error.message : "Candidate identity could not be loaded."); }); return () => { live = false; }; }, [applicationId]);
  async function save() { if (!workspace || busy) return; setBusy(true); setMessage(""); try { const saved = await recordCandidateIdentity({ applicationId, recordedName: name, reason, expectedVersion: workspace.version }); setWorkspace(await loadCandidateIdentity(applicationId)); setName(saved.recordedName); setReason(""); await onSaved?.(saved.recordedName); setMessage("Candidate name recorded and the report was refreshed."); } catch (error) { setMessage(error instanceof Error ? error.message : "Candidate name could not be saved."); } finally { setBusy(false); } }
  return <section id="candidate-identity" className="workspace-card candidate-identity-card" aria-labelledby="candidate-identity-heading">
    <div><p className="section-kicker">Candidate identity</p><h2 id="candidate-identity-heading">Confirm the name used in reports</h2><p>Check the candidate’s name against an authorised source before sharing. This changes the display name only; it does not verify qualifications, consent, or identity.</p></div>
    {workspace && <>
      <p><strong>Status:</strong> {workspace.confirmedAt ? "Human-recorded name" : workspace.recordedName ? "Existing name needs confirmation" : "Name not recorded"}</p>
      <label>Candidate display name<input value={name} maxLength={200} disabled={!workspace.canEdit || busy} onChange={(event) => setName(event.target.value)} placeholder="Example: Avery Tan (fictional)" /></label>
      <label>Reason for recording or changing the name<input value={reason} maxLength={1000} disabled={!workspace.canEdit || busy} onChange={(event) => setReason(event.target.value)} placeholder="Example: Checked against the candidate-provided CV" /></label>
      {workspace.canEdit && <button className="button button-primary" type="button" disabled={busy || name.trim().length < 2 || reason.trim().length < 10} onClick={save}>Record candidate name</button>}
      {workspace.confirmedAt && <p className="muted">Last confirmed {new Date(workspace.confirmedAt).toLocaleString()} · Version {workspace.version}</p>}
      {workspace.events.length > 0 && <details><summary>Name history ({workspace.events.length})</summary><ul>{workspace.events.map((event) => <li key={event.id}>{event.recordedName} · {event.actorName} · {new Date(event.createdAt).toLocaleString()} — {event.reason}</li>)}</ul></details>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
