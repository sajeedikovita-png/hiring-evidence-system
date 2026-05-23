import React from "react";
import { NoteTextArea } from "../../../components/ui/NoteTextArea";
import type { AuditLogEntry, UploadedDocument } from "../../types/hiring";

type ReportSupportSectionsProps = {
  missingEvidence: string[];
  verificationNeeded?: string[];
  interviewQuestions: string[];
  recruiterNotes: string[];
  documentSources?: UploadedDocument[];
  auditTrailPreview?: AuditLogEntry[];
};

export function ReportSupportSections({
  missingEvidence,
  verificationNeeded = [],
  interviewQuestions,
  recruiterNotes,
  documentSources = [],
  auditTrailPreview = []
}: ReportSupportSectionsProps) {
  return (
    <div className="support-grid">
      <section className="workspace-card">
        <p className="section-kicker">Missing evidence</p>
        <h2>Evidence gaps to verify</h2>
        <ul className="evidence-list">
          {missingEvidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="workspace-card">
        <p className="section-kicker">Suggested interview questions</p>
        <h2>Verification prompts</h2>
        {verificationNeeded.length > 0 ? (
          <ul className="evidence-list">
            {verificationNeeded.map((item) => (
              <li key={item}>Needs verification: {item}</li>
            ))}
          </ul>
        ) : null}
        <ol className="evidence-list numbered">
          {interviewQuestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <section className="workspace-card support-grid-wide">
        <p className="section-kicker">Recruiter decision notes</p>
        <div className="note-chip-row">
          {recruiterNotes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
        <NoteTextArea label="Recruiter notes" placeholder="Add job-related evidence notes, interview questions, or verification reminders." />
      </section>
      <section className="workspace-card">
        <p className="section-kicker">Document sources</p>
        <h2>Uploaded evidence sources</h2>
        <ul className="evidence-list">
          {documentSources.map((document) => (
            <li key={document.id}>{document.fileName}</li>
          ))}
        </ul>
      </section>
      <section className="workspace-card">
        <p className="section-kicker">Audit trail preview</p>
        <h2>Recent system records</h2>
        <ul className="evidence-list">
          {auditTrailPreview.map((entry) => (
            <li key={entry.id}>{entry.action}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
