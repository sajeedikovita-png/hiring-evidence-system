import React from "react";

export function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <a className="public-brand centered" href="/">
          <span className="brand-mark">HE</span>
          <span>Hiring Evidence System</span>
        </a>
        <div className="login-heading">
          <p className="section-kicker">Recruiter workspace</p>
          <h1>Sign in</h1>
          <p>Access candidate evidence reports and human decision notes.</p>
        </div>
        <form className="login-form">
          <label>
            Email address
            <input type="email" placeholder="name@organization.com" />
          </label>
          <label>
            Password
            <input type="password" placeholder="Password" />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" />
            <span>Remember this device</span>
          </label>
          <button className="button button-primary" type="button">
            Sign in
          </button>
        </form>
        <div className="login-divider">New to the platform?</div>
        <button className="button button-secondary" type="button">
          Request access
        </button>
        <p className="login-footnote">AI assists. Human decides. Evidence explains.</p>
      </section>
    </main>
  );
}
