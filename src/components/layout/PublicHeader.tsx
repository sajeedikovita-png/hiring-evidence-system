import React from "react";

export function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-brand" href="/">
        <span className="brand-mark">HE</span>
        <span>Hiring Evidence System</span>
      </a>
      <nav className="public-nav" aria-label="Public navigation">
        <a href="/#problem">Problem</a>
        <a href="/#how-it-works">How it works</a>
        <a href="/#sample-report">Sample report</a>
        <a href="/demo-presentation">Slideshow</a>
        <a href="/demo-test-lab">Demo lab</a>
        <a href="/login">Login</a>
      </nav>
      <a className="button button-primary" href="/request-pilot">
        Request pilot access
      </a>
    </header>
  );
}
