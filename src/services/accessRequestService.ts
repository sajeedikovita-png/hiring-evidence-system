/**
 * Public access-request submission.
 *
 * The public "request pilot access" form saves each request into the Supabase
 * `access_requests` table so a real request actually reaches the backend (row-level
 * security lets anyone insert, but only an admin can read/approve). This uses a
 * PUBLIC anon key (safe to expose) and is independent of the app's seed/supabase
 * mode, so the internal demo keeps working with no login while real requests are
 * still captured.
 */

export type AccessRequestInput = {
  companyName: string;
  workEmail: string;
  requesterRole: string;
  hiringVolume: string;
  firstRoleToReview: string;
  note: string;
};

export type AccessRequestResult = { ok: boolean; message?: string };

type PublicBackendConfig = { url: string; anonKey: string };

function getPublicBackendConfig(): PublicBackendConfig | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const url = env.VITE_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (url && anonKey) {
    return { url, anonKey };
  }

  return undefined;
}

export function isAccessRequestBackendConfigured(): boolean {
  return Boolean(getPublicBackendConfig());
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * What the visitor is told when the request did not reach the backend.
 *
 * It must never read as success. A prospect who is told "recorded" when nothing was
 * saved waits for a reply that will never come, and the founder never learns they
 * asked — which, with approvals handled one at a time by hand, is the single most
 * expensive silent failure in the funnel.
 */
export function getAccessRequestFailureMessage(message?: string): string {
  if (message === "backend_not_configured") {
    return "Requests cannot be submitted right now. Please email us instead and we will set your pilot up.";
  }
  if (message?.startsWith("request_failed_4")) {
    return "That request could not be accepted. Check the details and try again.";
  }

  return "We could not reach our servers, so nothing was submitted. Your details are still here — please try again.";
}

/** `deps` exists so tests can prove success is reported only on a confirmed save. */
export type AccessRequestDeps = {
  fetchFn?: typeof fetch;
  config?: PublicBackendConfig;
};

export async function saveAccessRequestToBackend(
  input: AccessRequestInput,
  deps: AccessRequestDeps = {}
): Promise<AccessRequestResult> {
  const config = deps.config ?? getPublicBackendConfig();
  const fetchFn = deps.fetchFn ?? (typeof fetch === "function" ? fetch : undefined);

  if (!config || !fetchFn) {
    return { ok: false, message: "backend_not_configured" };
  }

  try {
    const response = await fetchFn(`${config.url}/rest/v1/access_requests`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        company_name: input.companyName.trim(),
        work_email: input.workEmail.trim(),
        requester_role: toNullable(input.requesterRole),
        hiring_volume: toNullable(input.hiringVolume),
        first_role_to_review: toNullable(input.firstRoleToReview),
        note: toNullable(input.note)
      })
    });

    if (!response.ok) {
      return { ok: false, message: `request_failed_${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "network_error" };
  }
}
