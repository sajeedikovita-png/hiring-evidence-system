import type { RepositorySource } from "./hiringRepository";
import {
  getMissingSupabaseEnvKeys,
  getRuntimeSupabaseEnv,
  type SupabaseRuntimeEnv
} from "./supabaseConfig";

export type ConnectionIssue =
  | "ready"
  | "missing_env_vars"
  | "auth_user_missing"
  | "company_context_missing"
  | "dashboard_read_failed"
  | "report_read_failed"
  | "decision_save_failed";

export type DevelopmentConnectionStatus = {
  modeLabel: "Seed fallback mode" | "Supabase connected mode";
  issueLabel:
    | "Ready for live smoke test"
    | "Missing env vars"
    | "Auth user missing"
    | "Company context missing"
    | "Dashboard cannot load"
    | "Report cannot load"
    | "Decision save failed";
  detail: string;
  tone: "info" | "success" | "warning" | "danger";
};

type ConnectionStatusInput = {
  repositorySource: RepositorySource;
  env?: SupabaseRuntimeEnv;
  issue?: ConnectionIssue;
  error?: unknown;
};

const secretLikePattern = /([A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|[A-Za-z0-9_-]{24,})/g;

export function sanitizeSupabaseErrorMessage(error: unknown, env: SupabaseRuntimeEnv = getRuntimeSupabaseEnv()): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  let sanitized = message;

  for (const value of [env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY]) {
    if (value?.trim()) {
      sanitized = sanitized.split(value.trim()).join("[redacted]");
    }
  }

  sanitized = sanitized.replace(/https:\/\/[A-Za-z0-9.-]+\.supabase\.co/g, "[redacted]");
  sanitized = sanitized.replace(secretLikePattern, "[redacted]");

  if (!sanitized.trim() || sanitized !== message) {
    return "Unable to complete Supabase request. Check project URL, anon key, auth user, and RLS setup.";
  }

  return sanitized;
}

export function classifyConnectionIssue(error: unknown, fallbackIssue: ConnectionIssue): ConnectionIssue {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/Authenticated user is required|Unable to read authenticated user/i.test(message)) {
    return "auth_user_missing";
  }

  if (/Active company context not found|Recruiter profile not found|company context/i.test(message)) {
    return "company_context_missing";
  }

  return fallbackIssue;
}

export function getDevelopmentConnectionStatus(input: ConnectionStatusInput): DevelopmentConnectionStatus {
  const env = input.env ?? getRuntimeSupabaseEnv();
  const missingEnvKeys = getMissingSupabaseEnvKeys(env);
  const issue = input.issue ?? (missingEnvKeys.length > 0 ? "missing_env_vars" : "ready");
  const modeLabel = input.repositorySource === "supabase" ? "Supabase connected mode" : "Seed fallback mode";

  if (issue === "missing_env_vars") {
    return {
      modeLabel,
      issueLabel: "Missing env vars",
      detail: `Add ${missingEnvKeys.join(" and ")} to .env.local to run the live Supabase smoke test.`,
      tone: "warning"
    };
  }

  if (issue === "auth_user_missing") {
    return {
      modeLabel,
      issueLabel: "Auth user missing",
      detail: "Sign in with a Supabase development auth user before reading company data.",
      tone: "danger"
    };
  }

  if (issue === "company_context_missing") {
    return {
      modeLabel,
      issueLabel: "Company context missing",
      detail: "Add an active recruiter profile for this auth user and company before continuing.",
      tone: "danger"
    };
  }

  if (issue === "dashboard_read_failed") {
    return {
      modeLabel,
      issueLabel: "Dashboard cannot load",
      detail: sanitizeSupabaseErrorMessage(input.error, env),
      tone: "danger"
    };
  }

  if (issue === "report_read_failed") {
    return {
      modeLabel,
      issueLabel: "Report cannot load",
      detail: sanitizeSupabaseErrorMessage(input.error, env),
      tone: "danger"
    };
  }

  if (issue === "decision_save_failed") {
    return {
      modeLabel,
      issueLabel: "Decision save failed",
      detail: sanitizeSupabaseErrorMessage(input.error, env),
      tone: "danger"
    };
  }

  return {
    modeLabel,
    issueLabel: "Ready for live smoke test",
    detail:
      input.repositorySource === "supabase"
        ? "Supabase env vars are configured. Confirm auth, company context, dashboard, report, decision, and audit writes."
        : "Seed data is active because Supabase is not configured for this browser session.",
    tone: input.repositorySource === "supabase" ? "success" : "info"
  };
}
