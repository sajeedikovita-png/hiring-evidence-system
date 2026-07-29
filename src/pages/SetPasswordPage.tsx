import React, { FormEvent, useEffect, useState } from "react";
import { getPublicSupabaseClient } from "../services/publicSupabaseClient";

type PageState = "checking" | "ready" | "invalid" | "saved";

export function SetPasswordPage() {
  const client = getPublicSupabaseClient();
  const [pageState, setPageState] = useState<PageState>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking your invitation link.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!client) {
      setPageState("invalid");
      setMessage("This page is not configured. Please contact support.");
      return;
    }

    let isMounted = true;

    // Supabase parses the invite/recovery token from the URL automatically.
    client.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        setEmail(data.session.user.email ?? null);
        setPageState("ready");
        setMessage("");
      }
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session) {
        setEmail(session.user.email ?? null);
        setPageState("ready");
        setMessage("");
      }
    });

    // If no session appears shortly, the link is invalid or expired.
    const timer = setTimeout(() => {
      if (isMounted) {
        setPageState((current) => {
          if (current === "checking") {
            setMessage("This link is invalid or has expired. Please request a new invitation.");
            return "invalid";
          }
          return current;
        });
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }

    setIsSaving(true);
    setMessage("Saving your password.");
    const { error } = await client.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPageState("saved");
    setMessage("");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <a className="public-brand centered" href="/">
          <span className="brand-mark">HE</span>
          <span>Hiring Evidence System</span>
        </a>

        {pageState === "saved" ? (
          <>
            <div className="login-heading">
              <p className="section-kicker">All set</p>
              <h1>Your password is saved.</h1>
              <p>You can now sign in and open your workspace.</p>
            </div>
            <a className="button button-primary" href="/dashboard">
              Go to my workspace
            </a>
          </>
        ) : (
          <>
            <div className="login-heading">
              <p className="section-kicker">Welcome</p>
              <h1>Set your password</h1>
              <p>{email ? `Finish setting up ${email}.` : "Choose a password to finish setting up your account."}</p>
            </div>

            {pageState === "ready" ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <label>
                  New password
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    required
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    type="password"
                    placeholder="Type it again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                    required
                  />
                </label>
                <button className="button button-primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving" : "Save password"}
                </button>
              </form>
            ) : null}

            {message ? <p className="login-footnote">{message}</p> : null}
          </>
        )}
      </section>
    </main>
  );
}
