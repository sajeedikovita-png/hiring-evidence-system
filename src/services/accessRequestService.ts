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

export async function saveAccessRequestToBackend(input: AccessRequestInput): Promise<AccessRequestResult> {
  const config = getPublicBackendConfig();
  if (!config) {
    return { ok: false, message: "backend_not_configured" };
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/access_requests`, {
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
