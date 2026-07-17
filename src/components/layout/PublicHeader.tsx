import React from "react";
import { Check } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <a className="public-brand" href="/">
          <span className="public-mark" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>Hiring Evidence System</span>
        </a>
        <nav className="public-nav" aria-label="Public navigation">
          <a href="/#problem">01 / Problem</a>
          <a href="/#how">02 / Process</a>
          <a href="/#report">03 / Report</a>
          <a href="/#compliance">04 / Compliance</a>
        </nav>
        <a className="public-cta" href="/request-pilot">
          Request pilot access
        </a>
      </div>
    </header>
  );
}
