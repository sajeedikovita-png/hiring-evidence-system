import React from "react";

const trailSteps = [
  ["01", "Role brief", "Job criteria"],
  ["02", "Source", "Resume evidence"],
  ["03", "Verify", "Missing proof"],
  ["04", "Human note", "Decision reason"]
];

export function EvidenceTrailSketch() {
  return (
    <figure className="evidence-trail-sketch" aria-label="Illustrated evidence trail from role criteria to a human decision reason">
      <svg className="evidence-trail-lines" viewBox="0 0 800 120" aria-hidden="true" preserveAspectRatio="none">
        <path className="sketch-path sketch-path-one" d="M94 65 C150 27 205 94 270 58 S383 35 425 62" />
        <path className="sketch-path sketch-path-two" d="M425 62 C482 92 527 28 595 59 S681 85 735 54" />
        <path className="sketch-arrow sketch-arrow-one" d="M258 50 L273 58 L260 69" />
        <path className="sketch-arrow sketch-arrow-two" d="M722 46 L738 54 L724 66" />
      </svg>
      <figcaption>Evidence trail</figcaption>
      <ol>
        {trailSteps.map(([number, title, detail]) => (
          <li key={number}>
            <span>{number}</span>
            <strong>{title}</strong>
            <small>{detail}</small>
          </li>
        ))}
      </ol>
      <p className="sketch-pencil-note" aria-hidden="true">trace it back</p>
    </figure>
  );
}
