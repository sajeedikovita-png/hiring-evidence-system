import React, { FormEvent, useMemo, useState } from "react";
import { requestRecruiterPasswordReset } from "../services/authService";
import { hasSupabaseConfig } from "../services/supabaseConfig";
import { createHiringSupabaseClient } from "../services/supabaseClient";

export function ForgotPasswordPage() {
  const configured = useMemo(() => hasSupabaseConfig(), []);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Enter your workspace email to receive a secure recovery link.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || isSubmitting) return;
    setIsSubmitting(true);
    setResult("idle");
    setMessage("Requesting a recovery email.");
    try {
      await requestRecruiterPasswordReset({
        client: createHiringSupabaseClient(),
        email,
        redirectTo: new URL("/set-password", window.location.origin).toString()
      });
      setResult("success");
      setMessage("Recovery request accepted. Check your inbox and Spam folder, then open the newest recovery link before setting your password.");
    } catch (error) {
      setResult("error");
      setMessage(error instanceof Error ? error.message : "Unable to request password recovery");
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
          <p className="section-kicker">Account recovery</p>
          <h1>Reset your password</h1>
          <p>The recovery email signs you in securely before you choose a new password.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
          </label>
          <button className="button button-primary" type="submit" disabled={!configured || isSubmitting || result === "success"}>
            {isSubmitting ? "Sending recovery email" : result === "success" ? "Recovery request accepted" : "Send recovery email"}
          </button>
        </form>
        <div
          className={`recovery-notice recovery-notice-${result}`}
          role={result === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <strong>{result === "success" ? "Check your email now" : result === "error" ? "Recovery request failed" : "Password recovery"}</strong>
          <span>{message}</span>
        </div>
        <a className="button button-secondary" href="/login">Return to sign in</a>
      </section>
    </main>
  );
}
