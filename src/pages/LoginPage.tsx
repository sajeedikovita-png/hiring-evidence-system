import React, { FormEvent, useMemo, useState } from "react";
import { signInRecruiterWithPassword } from "../services/authService";
import { getHiringRepositoryMode } from "../services/hiringRepository";
import { createHiringSupabaseClient } from "../services/supabaseClient";

export function LoginPage() {
  const repositoryMode = useMemo(() => getHiringRepositoryMode(), []);
  const [email, setEmail] = useState("sarah@northstar.example");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    repositoryMode === "supabase" ? "Sign in with the Supabase development recruiter user." : "Seed fallback mode is active."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (repositoryMode !== "supabase") {
      setMessage("Add Supabase env vars before using recruiter sign in.");
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
      window.location.assign("/dashboard");
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
          <label className="checkbox-row">
            <input type="checkbox" />
            <span>Remember this device</span>
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
