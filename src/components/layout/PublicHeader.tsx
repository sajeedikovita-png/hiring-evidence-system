import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);
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
        <button type="button" className="public-menu-toggle" aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close menu" : "Menu"}</button>
        <nav id="public-navigation" className={`public-nav public-nav-expanded${menuOpen ? " is-open" : ""}`} aria-label="Public navigation" onKeyDown={(event) => { if (event.key === "Escape") { const disclosure = (event.target as HTMLElement).closest("details"); if (disclosure) { disclosure.open = false; disclosure.querySelector("summary")?.focus(); } else { setMenuOpen(false); document.querySelector<HTMLButtonElement>(".public-menu-toggle")?.focus(); } } }}>
          <details key={`product-${location.key}`} className="public-nav-group"><summary>Product</summary><div><Link to="/product">Product overview</Link><Link to="/product/evidence-review">Evidence review</Link><Link to="/reports/candidate-evidence">Fictional sample report</Link></div></details>
          <details key={`solutions-${location.key}`} className="public-nav-group"><summary>Solutions</summary><div><Link to="/solutions/recruitment-agencies">Small recruitment agencies</Link><Link to="/solutions/hiring-teams">Small hiring teams</Link></div></details>
          <Link to="/demo-presentation">Demo</Link>
          <Link to="/pilot-terms">Pricing</Link>
          <Link to="/resources">Resources</Link>
          <Link className="public-mobile-signin" to="/login">Company sign in</Link>
        </nav>
        <div className="public-header-actions">
          <Link className="public-login-link" to="/login">Company sign in</Link>
          <Link className="button button-primary" to="/request-pilot">Free role walkthrough</Link>
        </div>
      </div>
    </header>
  );
}
