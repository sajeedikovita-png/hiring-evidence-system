import React from "react";

const steps = ["Upload CV", "Check text", "Generate report", "Review evidence"];
export function ReviewProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return <nav aria-label="Evidence report progress" className="review-progress"><ol>{steps.map((label, index) => <li key={label} aria-current={index + 1 === step ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol></nav>;
}
