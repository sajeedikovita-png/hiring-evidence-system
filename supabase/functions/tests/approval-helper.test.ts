import {
  findAuthUserByNormalizedEmail,
  getValidatedInvitationRedirectUrl,
  normalizeApprovalEmail,
  type AuthUserPageFetcher
} from "../_shared/approval.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("normalizes approval email before lookup", () => {
  assert(
    normalizeApprovalEmail("  Owner@Example.TEST ") === "owner@example.test",
    "email normalization must trim and lowercase the request email"
  );
  assert(normalizeApprovalEmail(null) === "", "non-string email values fail closed");
});

Deno.test("uses only a validated APP_URL for invitation redirects", () => {
  assert(
    getValidatedInvitationRedirectUrl("https://app.example.test/workspace") ===
      "https://app.example.test/set-password",
    "HTTPS APP_URL resolves to the application password route"
  );
  assert(
    getValidatedInvitationRedirectUrl("http://localhost:3000") ===
      "http://localhost:3000/set-password",
    "localhost development remains usable"
  );
  for (const unsafeUrl of [
    "",
    "http://app.example.test",
    "https://user:password@app.example.test",
    "https://app.example.test/?next=https://attacker.example",
    "https://app.example.test/#attacker"
  ]) {
    assert(
      getValidatedInvitationRedirectUrl(unsafeUrl) === undefined,
      `unsafe APP_URL must be rejected: ${unsafeUrl}`
    );
  }
});

Deno.test("finds an Auth user beyond the first 1,000-user page", async () => {
  const calls: Array<{ page: number; perPage: number }> = [];
  const fetchPage: AuthUserPageFetcher = async ({ page, perPage }) => {
    calls.push({ page, perPage });
    if (page === 1) {
      return {
        data: {
          users: Array.from({ length: 1000 }, (_, index) => ({
            id: `first-page-${index}`,
            email: `person-${index}@example.test`
          }))
        },
        error: null
      };
    }
    return {
      data: { users: [{ id: "target-user", email: "Owner@Example.Test" }] },
      error: null
    };
  };

  const user = await findAuthUserByNormalizedEmail("owner@example.test", fetchPage);
  assert(user?.id === "target-user", "second-page user must be found");
  assert(
    JSON.stringify(calls) === JSON.stringify([{ page: 1, perPage: 1000 }, { page: 2, perPage: 1000 }]),
    "lookup must request the next bounded page"
  );
});

Deno.test("stops once Auth pagination is exhausted without a provider mutation", async () => {
  let calls = 0;
  const user = await findAuthUserByNormalizedEmail("missing@example.test", async () => {
    calls += 1;
    return { data: { users: [] }, error: null };
  });

  assert(user === undefined, "missing user should be returned as undefined");
  assert(calls === 1, "empty first page proves pagination is exhausted");
});

Deno.test("fails closed when an Auth pagination page errors", async () => {
  try {
    await findAuthUserByNormalizedEmail("owner@example.test", async () => ({
      data: null,
      error: { message: "provider unavailable" }
    }));
  } catch (error) {
    assert(error instanceof Error && error.message === "Unable to inspect existing users", "error is normalized");
    return;
  }
  throw new Error("Auth lookup errors must not be treated as a missing user");
});

Deno.test("caps a malformed unending Auth pagination response", async () => {
  let calls = 0;
  try {
    await findAuthUserByNormalizedEmail("missing@example.test", async () => {
      calls += 1;
      return {
        data: {
          users: Array.from({ length: 1000 }, (_, index) => ({ id: `${calls}-${index}` }))
        },
        error: null
      };
    });
  } catch (error) {
    assert(
      error instanceof Error && error.message === "Auth user lookup exceeded the safe page limit",
      "unending pages must fail closed at the explicit cap"
    );
    assert(calls === 100, "lookup must stop at the documented maximum page count");
    return;
  }
  throw new Error("unending Auth pagination must not be treated as exhausted");
});
