import React, { FormEvent, useMemo, useState } from "react";
import { signInRecruiterWithPassword } from "../services/authService";
import { isCurrentPlatformAdministrator } from "../services/accessApprovalService";
import { hasSupabaseConfig } from "../services/supabaseConfig";
import { createHiringSupabaseClient } from "../services/supabaseClient";

export function LoginPage() {
  const configured = useMemo(() => hasSupabaseConfig(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    configured ? "Sign in with your recruiter workspace account." : "Workspace sign-in is not configured."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured) {
      setMessage("Workspace sign-in is not configured. Contact your administrator for help.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Signing in.");

    try {
      await signInRecruiterWithPassword({
        client: createHiringSupabaseClient(),
        email,
        password
      });
      let destination = "/dashboard";
      try {
        if (await isCurrentPlatformAdministrator()) destination = "/admin/access-requests";
      } catch {
        // The protected destination rechecks access. A routing check must not turn a valid sign-in into an error.
      }
      window.location.assign(destination);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              placeholder="name@organization.com"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
          </label>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="login-footnote">{message}</p>
        <div className="login-divider">New to the platform?</div>
        <a className="button button-secondary" href="/request-pilot">
          Request access
        </a>
        <a className="login-help-link" href="/forgot-password">
          Forgot your password?
        </a>
        <p className="login-footnote">AI assists. Human decides. Evidence explains.</p>
      </section>
    </main>
  );
}
