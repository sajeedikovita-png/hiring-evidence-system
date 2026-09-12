import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { createHiringSupabaseClient } from "../../services/supabaseClient";
import { hasSupabaseConfig } from "../../services/supabaseConfig";
import { isCurrentPlatformAdministrator } from "../../services/accessApprovalService";
import {
  resolveWorkspaceAccess,
  createWorkspaceAccessGeneration,
  type WorkspaceAccess,
  type WorkspaceAccessGeneration,
  WorkspaceAccessError
} from "../../services/workspaceAccessService";

type WorkspaceAccessBoundaryProps = {
  children?: React.ReactNode;
  requireAdmin?: boolean;
};

type AccessState =
  | { state: "loading" }
  | { state: "denied"; message: string }
  | { state: "ready"; access: WorkspaceAccess };

function accessMessage(error: unknown, requireAdmin: boolean) {
  if (error instanceof WorkspaceAccessError) {
    if (error.reason === "configuration_missing") return "Workspace sign-in is not configured.";
    if (error.reason === "authentication_required") return "Sign in to access this workspace.";
    if (error.reason === "role_invalid" && requireAdmin) return "Platform administrator access is required for this page.";
    return "Your workspace access is not active. Contact an administrator for help.";
  }

  return "We could not confirm workspace access. Please try again.";
}

export function WorkspaceAccessBoundary({ children, requireAdmin = false }: WorkspaceAccessBoundaryProps) {
  const configured = hasSupabaseConfig();
  const clientSetup = useMemo(() => {
    if (!configured) return { client: undefined, unavailableMessage: "Workspace sign-in is not configured." };
    try {
      return { client: createHiringSupabaseClient(), unavailableMessage: "" };
    } catch {
      return { client: undefined, unavailableMessage: "Workspace sign-in is unavailable. Please try again later." };
    }
  }, [configured]);
  const client = clientSetup.client;
  const [accessState, setAccessState] = useState<AccessState>(() =>
    client ? { state: "loading" } : { state: "denied", message: clientSetup.unavailableMessage }
  );
  const accessCheckGeneration = useRef<WorkspaceAccessGeneration>(createWorkspaceAccessGeneration());

  const refreshAccess = useCallback(async (expectedGeneration?: number) => {
    const generation = expectedGeneration ?? accessCheckGeneration.current.start();
    if (!client) {
      if (accessCheckGeneration.current.isCurrent(generation)) {
        accessCheckGeneration.current.invalidate();
        setAccessState({ state: "denied", message: clientSetup.unavailableMessage });
      }
      return;
    }

    setAccessState({ state: "loading" });
    const timeout = window.setTimeout(() => {
      if (accessCheckGeneration.current.isCurrent(generation)) {
        accessCheckGeneration.current.invalidate();
        setAccessState({ state: "denied", message: "We could not confirm workspace access. Please try again." });
      }
    }, 10_000);
    const settle = (nextState: AccessState) => {
      if (!accessCheckGeneration.current.isCurrent(generation)) return;
      window.clearTimeout(timeout);
      accessCheckGeneration.current.invalidate();
      setAccessState(nextState);
    };

    try {
      if (requireAdmin) {
        if (!(await isCurrentPlatformAdministrator(client))) throw new WorkspaceAccessError("role_invalid");
        settle({
          state: "ready",
          access: { companyId: "", companyName: "", userId: "", userName: "Platform administrator", role: "admin" }
        });
        return;
      }

      const access = await resolveWorkspaceAccess(client);
      settle({ state: "ready", access });
    } catch (error) {
      settle({ state: "denied", message: accessMessage(error, requireAdmin) });
    }
  }, [client, clientSetup.unavailableMessage, requireAdmin]);

  useEffect(() => {
    const generation = accessCheckGeneration.current.start();
    void refreshAccess(generation);
  }, [refreshAccess]);

  useEffect(() => {
    if (!client) return;

    const { data } = client.auth.onAuthStateChange((event) => {
      // The initial access check above already covers INITIAL_SESSION. Running
      // it again adds another user/profile round trip on every fresh page load.
      if (event === "INITIAL_SESSION") return;

      // Supabase warns against awaiting its client inside this callback. Queue
      // the refresh after the event has completed to avoid auth lock deadlocks.
      accessCheckGeneration.current.invalidate();
      if (event === "SIGNED_OUT") {
        setAccessState({ state: "denied", message: "Sign in to access this workspace." });
        return;
      }

      // Token refreshes keep the same signed-in user and do not require a new
      // company-profile lookup. User changes still get a fresh access check.
      if (event === "TOKEN_REFRESHED") return;

      setAccessState({ state: "loading" });
      queueMicrotask(() => void refreshAccess());
    });

    return () => {
      accessCheckGeneration.current.invalidate();
      data.subscription.unsubscribe();
    };
  }, [client, refreshAccess]);

  if (accessState.state === "ready") return <>{children ?? <Outlet />}</>;

  return (
    <main className="login-page">
      <section className="login-card" aria-live="polite">
        <Link className="public-brand centered" to="/">
          <span className="brand-mark">HE</span>
          <span>Hiring Evidence System</span>
        </Link>
        <div className="login-heading">
          <p className="section-kicker">Recruiter workspace</p>
          <h1>{accessState.state === "loading" ? "Checking workspace access" : "Workspace access required"}</h1>
          <p>{accessState.state === "loading" ? "Please wait while we confirm your account." : accessState.message}</p>
        </div>
        {accessState.state === "denied" ? (
          <div className="hero-actions">
            <Link className="button button-primary" to="/login">Sign in</Link>
            <button className="button button-secondary" type="button" onClick={() => void refreshAccess()}>
              Try again
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
