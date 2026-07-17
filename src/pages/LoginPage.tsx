import React, { FormEvent, useState } from "react";
import { signInRecruiterWithPassword } from "../services/authService";
import { getPublicSupabaseClient } from "../services/publicSupabaseClient";
import { createHiringSupabaseClient } from "../services/supabaseClient";
import { hasSupabaseConfig } from "../services/supabaseConfig";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in to open your workspace.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Prefer the recruiter workspace client so the session lands where the
    // dashboard/report data layer reads it; fall back to the public client.
    const client = hasSupabaseConfig() ? createHiringSupabaseClient() : getPublicSupabaseClient();

    if (!client) {
      setMessage("Sign-in is not available right now.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Signing in.");

    try {
      await signInRecruiterWithPassword({ client, email, password });
      window.location.assign("/dashboard");
    } catch (error) {
      setIsSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
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
          <p className="section-kicker">Workspace</p>
          <h1>Sign in</h1>
          <p>Access your access requests and evidence reports.</p>
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
        <p className="login-footnote">AI assists. Human decides. Evidence explains.</p>
      </section>
    </main>
  );
}
