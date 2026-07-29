import React, { useEffect, useState } from "react";
import { getPublicSupabaseClient } from "../services/publicSupabaseClient";

type AccessRequest = {
  id: string;
  company_name: string;
  work_email: string;
  requester_role: string | null;
  hiring_volume: string | null;
  first_role_to_review: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ViewState = "loading" | "signed_out" | "ready" | "error";

function statusTone(status: AccessRequest["status"]): string {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function AdminPage() {
  const client = getPublicSupabaseClient();
  const [view, setView] = useState<ViewState>("loading");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setErrorMessage("Workspace is not configured.");
      setView("error");
      return;
    }

    let isMounted = true;

    client.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      if (!data.session) {
        setView("signed_out");
        return;
      }
      setAdminEmail(data.session.user.email ?? null);

      const { data: rows, error } = await client
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (error) {
        setErrorMessage(error.message);
        setView("error");
        return;
      }
      setRequests((rows ?? []) as AccessRequest[]);
      setView("ready");
    });

    return () => {
      isMounted = false;
    };
  }, [client]);

  async function approveRequest(id: string) {
    if (!client) return;
    setBusyId(id);
    setErrorMessage("");
    const { data, error } = await client.functions.invoke<{ ok: boolean; error?: string; emailed?: boolean }>(
      "approve-request",
      { body: { requestId: id } }
    );
    setBusyId(null);
    if (error || !data?.ok) {
      setErrorMessage(data?.error ?? error?.message ?? "Could not approve this request.");
      return;
    }
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status: "approved" } : request)));
  }

  async function rejectRequest(id: string) {
    if (!client) return;
    setBusyId(id);
    const { error } = await client
      .from("access_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status: "rejected" } : request)));
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    window.location.assign("/login");
  }

  if (view === "loading") {
    return (
      <main className="login-page">
        <section className="login-card">
          <p className="login-footnote">Loading your workspace.</p>
        </section>
      </main>
    );
  }

  if (view === "signed_out") {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-heading">
            <p className="section-kicker">Workspace</p>
            <h1>Please sign in</h1>
            <p>Sign in to see and approve access requests.</p>
          </div>
          <a className="button button-primary" href="/login">
            Sign in
          </a>
        </section>
      </main>
    );
  }

  const pendingCount = requests.filter((request) => request.status === "pending").length;

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <a className="public-brand" href="/">
            <span className="public-mark" aria-hidden="true">
              HE
            </span>
            <span>Hiring Evidence System</span>
          </a>
          <div className="admin-header-actions">
            {adminEmail ? <span className="muted">{adminEmail}</span> : null}
            <button className="button button-secondary" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="admin-page">
        <section className="dashboard-intro">
          <div>
            <p className="section-kicker">Admin workspace</p>
            <h2>Access requests</h2>
            <p>
              {pendingCount} waiting for your review. Approve the companies you want to give a pilot to.
            </p>
          </div>
        </section>

        {errorMessage ? <p className="login-footnote">{errorMessage}</p> : null}

        <section className="admin-request-list">
          {requests.length === 0 ? (
            <p className="muted">
              No requests yet. When someone fills the &ldquo;Request pilot access&rdquo; form, it appears here.
            </p>
          ) : (
            requests.map((request) => (
              <article className="admin-request-card" key={request.id}>
                <div className="admin-request-main">
                  <strong>{request.company_name}</strong>
                  <span>{request.work_email}</span>
                  <span className="muted">
                    {[request.requester_role, request.first_role_to_review, request.hiring_volume]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {request.note ? <p className="muted">{request.note}</p> : null}
                  <span className="muted">Submitted {formatSubmittedAt(request.created_at)}</span>
                </div>
                <div className="admin-request-side">
                  <span className={`badge badge-${statusTone(request.status)}`}>{request.status}</span>
                  {request.status === "pending" ? (
                    <div className="admin-request-actions">
                      <button
                        className="button button-primary"
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => approveRequest(request.id)}
                      >
                        {busyId === request.id ? "Approving" : "Approve & email"}
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={busyId === request.id}
                        onClick={() => rejectRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
