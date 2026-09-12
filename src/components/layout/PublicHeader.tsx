import React from "react";
import { Link } from "react-router-dom";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-edition-line">
        <span>Singapore · Evidence-led hiring review</span>
        <span>AI assists · Human decides</span>
      </div>
      <div className="public-header-inner">
        <Link className="public-brand" to="/" aria-label="Hiring Evidence System home">
          <strong>Hiring Evidence</strong>
          <small>Recruiter review system</small>
        </Link>
        <nav className="public-nav" aria-label="Public navigation">
          <a href="/#product">Product</a>
          <a href="/#how-it-works">How review works</a>
          <Link to="/reports/candidate-evidence">Sample report</Link>
          <Link to="/singapore-readiness">Singapore readiness</Link>
          <Link to="/pilot-terms">Pilot terms</Link>
        </nav>
        <div className="public-header-actions">
          <Link className="public-login-link" to="/login">Company sign in</Link>
          <Link className="button button-primary" to="/request-pilot">Request pilot</Link>
        </div>
      </div>
    </header>
  );
}
