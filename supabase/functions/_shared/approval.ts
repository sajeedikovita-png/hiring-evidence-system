export type AuthUserSummary = {
  id: string;
  email?: string | null;
};

export type AuthUserPage = {
  data: { users: AuthUserSummary[] } | null;
  error: unknown | null;
};

export type AuthUserPageFetcher = (pagination: {
  page: number;
  perPage: number;
}) => PromiseLike<AuthUserPage>;

const AUTH_USERS_PER_PAGE = 1000;
const MAX_AUTH_USER_PAGES = 100;

export function normalizeApprovalEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Resolves an Auth account without assuming the requested account is among the
 * first page of users. The explicit cap keeps a corrupted Auth pagination
 * response from consuming unbounded Edge-function time.
 */
export async function findAuthUserByNormalizedEmail(
  normalizedEmail: string,
  fetchPage: AuthUserPageFetcher
): Promise<AuthUserSummary | undefined> {
  for (let page = 1; page <= MAX_AUTH_USER_PAGES; page += 1) {
    const result = await fetchPage({ page, perPage: AUTH_USERS_PER_PAGE });
    if (result.error) {
      throw new Error("Unable to inspect existing users");
    }

    const users = result.data?.users ?? [];
    const user = users.find(
      (candidate) => normalizeApprovalEmail(candidate.email) === normalizedEmail
    );
    if (user) return user;

    // A short page (including an empty final page) proves there are no more
    // users to search. An exact multiple of 1,000 makes one safe empty request.
    if (users.length < AUTH_USERS_PER_PAGE) return undefined;
  }

  throw new Error("Auth user lookup exceeded the safe page limit");
}

/**
 * Returns only a same-origin password setup URL. Production APP_URL values
 * must be HTTPS; local HTTP is allowed solely for localhost development.
 */
export function getValidatedInvitationRedirectUrl(
  configuredAppUrl = Deno.env.get("APP_URL")
): string | undefined {
  if (!configuredAppUrl) return undefined;

  try {
    const appUrl = new URL(configuredAppUrl);
    const isLocalDevelopment =
      appUrl.protocol === "http:" &&
      (appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1");
    const isAllowedProtocol = appUrl.protocol === "https:" || isLocalDevelopment;

    if (
      !isAllowedProtocol ||
      appUrl.username ||
      appUrl.password ||
      appUrl.search ||
      appUrl.hash
    ) {
      return undefined;
    }

    return new URL("/set-password", appUrl.origin).toString();
  } catch {
    return undefined;
  }
}
