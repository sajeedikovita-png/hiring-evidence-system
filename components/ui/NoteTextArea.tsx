import React from "react";
import type { TextareaHTMLAttributes } from "react";

type NoteTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function NoteTextArea({ label, id, ...props }: NoteTextAreaProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <div className="note-field">
      <label className="note-label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea className="note-textarea" id={fieldId} {...props} />
    </div>
  );
}
