import React, { FormEvent, useState } from "react";
import { updateRecruiterPassword } from "../services/authService";
import { createHiringSupabaseClient } from "../services/supabaseClient";

export function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("Open this page from your Supabase invitation email.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmation) {
      setMessage("Passwords must match.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Saving your password.");

    try {
      await updateRecruiterPassword({
        client: createHiringSupabaseClient(),
        password
      });
      setMessage("Password saved. Opening your workspace.");
      window.location.assign("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to set password");
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
          <p className="section-kicker">Invitation setup</p>
          <h1>Set your password</h1>
          <p>Create a password for your recruiter workspace.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving password" : "Save password"}
          </button>
        </form>
        <p className="login-footnote" role="status">
          {message}
        </p>
        <a className="button button-secondary" href="/login">
          Return to sign in
        </a>
      </section>
    </main>
  );
}
