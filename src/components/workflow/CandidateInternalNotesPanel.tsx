import React, { useEffect, useId, useRef, useState } from "react";
import { listCandidateInternalNotes, createCandidateInternalNote, updateCandidateInternalNote, listCandidateInternalNoteEvents } from "../../services/candidateInternalNotesService";

export const candidateInternalNotesPanelService = { listCandidateInternalNotes, createCandidateInternalNote, updateCandidateInternalNote, listCandidateInternalNoteEvents };
type NotesData = Awaited<ReturnType<typeof listCandidateInternalNotes>>;
type Note = NotesData["notes"][number];
type History = Awaited<ReturnType<typeof listCandidateInternalNoteEvents>>;
type Kind = "candidate_statement" | "reviewer_observation" | "verification_record";
export const internalNoteKindLabels: Record<Kind, string> = { candidate_statement: "Candidate explanation", reviewer_observation: "Reviewer observation", verification_record: "Verification record" };
function timestamp(value: string) { return new Date(value).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }); }
function message(error: unknown) { return error instanceof Error ? error.message : "Unable to load or save internal notes. Please try again."; }
export function CandidateInternalNoteContent({ note }: { note: Note }) {
  return <><strong>{internalNoteKindLabels[note.kind]}</strong><p className="internal-note-meta">{note.authorName || "Former reviewer"} · <time dateTime={note.createdAt}>{timestamp(note.createdAt)}</time>{note.version > 1 && <> · Edited <time dateTime={note.updatedAt}>{timestamp(note.updatedAt)}</time></>}</p><p className="internal-note-body">{note.body}</p></>;
}
export function CandidateInternalNotesPanel({ applicationId, candidateName, onClose, service = candidateInternalNotesPanelService }: { applicationId: string; candidateName: string; onClose?: () => void; service?: typeof candidateInternalNotesPanelService }) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const createRequest = useRef<{ body: string; kind: Kind; id: string } | null>(null);
  const generation = useRef(0);
  const historyGeneration = useRef(0);
  const [data, setData] = useState<NotesData | null>(null);
  const [loadedApplication, setLoadedApplication] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [kind, setKind] = useState<Kind>("reviewer_observation");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyNote, setHistoryNote] = useState("");
  const [history, setHistory] = useState<History>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  useEffect(() => {
    const token = ++generation.current;
    createRequest.current = null;
    setData(null); setLoadError(""); setBody(""); setEditing(null); setBusy(false); setSaveError(""); setNotice(""); setHistoryNote(""); setHistory([]); setKind("reviewer_observation");
    service.listCandidateInternalNotes(applicationId).then(result => { if (generation.current === token) { setData(result); setLoadedApplication(applicationId); } }).catch(error => { if (generation.current === token) setLoadError(message(error)); });
    return () => { generation.current++; historyGeneration.current++; };
  }, [applicationId, reload, service]);
  useEffect(() => { if (onClose) heading.current?.focus(); }, [applicationId]);
  const current = loadedApplication === applicationId ? data : null;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || busy || (editing ? !editing.canEdit : !current.canCreate)) return;
    const token = generation.current;
    setBusy(true); setSaveError(""); setNotice("");
    try {
      if (!editing && (!createRequest.current || createRequest.current.body !== body || createRequest.current.kind !== kind)) createRequest.current = { body, kind, id: crypto.randomUUID() };
      const note = editing ? await service.updateCandidateInternalNote({ noteId: editing.id, kind, body, expectedVersion: editing.version }) : await service.createCandidateInternalNote({ applicationId, kind, body, requestId: createRequest.current!.id });
      if (generation.current !== token) return;
      setData(value => {
        if (!value) return value;

        const existingNote = value.notes.some(item => item.id === note.id);
        return {
          ...value,
          notes: existingNote
            ? value.notes.map(item => item.id === note.id ? note : item)
            : [...value.notes, note],
        };
      });
      createRequest.current = null;
      setBody(""); setEditing(null); setNotice("Internal note saved. Client summaries and shared reports are unchanged.");
      if (historyNote === note.id) void showHistory(note.id);
    } catch (error) { if (generation.current === token) setSaveError(message(error)); }
    finally { if (generation.current === token) setBusy(false); }
  }
  async function showHistory(noteId: string) {
    const token = ++historyGeneration.current;
    setHistoryNote(noteId); setHistory([]); setHistoryError(""); setHistoryBusy(true);
    try { const result = await service.listCandidateInternalNoteEvents(noteId); if (historyGeneration.current === token) setHistory(result); }
    catch (error) { if (historyGeneration.current === token) setHistoryError(message(error)); }
    finally { if (historyGeneration.current === token) setHistoryBusy(false); }
  }
  return <section className="workspace-card internal-notes" aria-labelledby={headingId}>
    <header><p className="section-kicker">Company workspace · {candidateName}</p><h2 id={headingId} ref={heading} tabIndex={-1}>Internal recruiter notes</h2></header>
    <p className="internal-notes-disclosure">Visible to authorised members of your company. Excluded from client summaries and shared reports.</p>
    <p>Record job-related explanations, observations and verification. These notes do not replace a human decision and its reason.</p>
    {loadError ? <div role="alert"><p>{loadError}</p><button type="button" className="button" onClick={() => setReload(value => value + 1)}>Retry notes</button></div> : !current ? <p role="status">Loading internal notes…</p> : <>
      {(current.canCreate || editing?.canEdit) ? <form onSubmit={save}><h3>{editing ? "Edit your note" : "Add an internal note"}</h3><label>Note type<select disabled={busy} value={kind} onChange={event => setKind(event.target.value as Kind)}>{Object.entries(internalNoteKindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Job-related note<textarea disabled={busy} required maxLength={4000} value={body} onChange={event => setBody(event.target.value)} placeholder="Candidate explained the API migration. Ask their project lead to confirm delivery responsibilities." /></label><p className="internal-note-meta">{body.length}/4000 characters · Plain text. Record the source of claims and what still needs verification.</p><div className="workflow-actions"><button type="submit" className="button button-primary" disabled={busy || !body.trim()}>{busy ? "Saving internal note…" : editing ? "Save note changes" : "Save internal note"}</button>{editing && <button type="button" className="button" disabled={busy} onClick={() => { setEditing(null); setBody(""); setSaveError(""); }}>Cancel edit / discard draft</button>}</div></form> : <p>Internal notes are read only for your current access.</p>}
      {saveError && <div role="alert"><p>{saveError} Your draft remains in the form.</p><button type="button" className="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Discard draft and reload latest notes</button></div>}{notice && <p role="status">{notice}</p>}
      <h3>Saved internal notes</h3>{current.notes.length ? <ul className="internal-notes-list">{current.notes.map(note => <li key={note.id}><CandidateInternalNoteContent note={note} /><div className="workflow-actions">{note.canEdit && <button type="button" className="button" disabled={busy || !!body || !!editing} onClick={() => { setEditing(note); setKind(note.kind); setBody(note.body); setNotice(""); setSaveError(""); heading.current?.focus(); }}>Edit your note</button>}<button type="button" className="button" onClick={() => void showHistory(note.id)}>View note history</button></div>{historyNote === note.id && <div><h4>Note history</h4>{historyBusy ? <p role="status">Loading note history…</p> : historyError ? <div role="alert"><p>{historyError}</p><button type="button" className="button" onClick={() => void showHistory(note.id)}>Retry note history</button></div> : <ol className="internal-note-history">{history.map(entry => <li key={entry.id}><strong>{entry.actorName || "Former reviewer"}</strong> · <time dateTime={entry.createdAt}>{timestamp(entry.createdAt)}</time><p>{internalNoteKindLabels[entry.state.kind]}</p><p className="internal-note-body">{entry.state.body}</p></li>)}</ol>}</div>}</li>)}</ul> : <p>{current.canCreate ? "No internal notes yet. Add the first job-related observation above." : "No internal notes recorded yet."}</p>}
    </>}
    {onClose && <button type="button" className="button" disabled={busy} onClick={onClose}>{body ? "Close notes / discard unsaved draft" : "Close notes"}</button>}
  </section>;
}
