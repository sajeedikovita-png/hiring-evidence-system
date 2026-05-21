import React from "react";
import { NoteTextArea } from "../../../components/ui/NoteTextArea";

type ReportSupportSectionsProps = {
  missingEvidence: string[];
  interviewQuestions: string[];
  recruiterNotes: string[];
};

export function ReportSupportSections({ missingEvidence, interviewQuestions, recruiterNotes }: ReportSupportSectionsProps) {
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
    </div>
  );
}
