import { authorizeAdmin } from "../_shared/supabase.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type PlatformRecord = { user_id: string; status: string } | null;

function createAdminClient(record: PlatformRecord) {
  const filters: Array<[string, unknown]> = [];
  const query = {
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return query;
    },
    async maybeSingle() {
      return { data: record, error: null };
    }
  };

  return {
    filters,
    client: {
      auth: {
        async getUser(token: string) {
          assert(token === "valid-token", "token should be passed to Supabase Auth");
          return { data: { user: { id: "platform-user" } }, error: null };
        }
      },
      from(table: string) {
        assert(table === "platform_admins", "only the platform allowlist should authorize access requests");
        return {
          select(columns: string) {
            assert(columns === "user_id, status", "authorization should check allowlist status");
            return query;
          }
        };
      }
    }
  };
}

function platformRequest() {
  return new Request("https://example.test/functions/v1/approve-access-request", {
    headers: { Authorization: "Bearer valid-token" }
  });
}

Deno.test("accepts an authenticated active platform operator", async () => {
  const mock = createAdminClient({ user_id: "platform-user", status: "active" });
  const authorized = await authorizeAdmin(platformRequest(), mock.client as never);

  assert(authorized.user_id === "platform-user", "active operator should be authorized");
  assert(
    mock.filters.some(([column, value]) => column === "status" && value === "active"),
    "allowlist query should require active status"
  );
});

Deno.test("rejects a disabled platform operator", async () => {
  const mock = createAdminClient({ user_id: "platform-user", status: "disabled" });
  await assertRejects(
    () => authorizeAdmin(platformRequest(), mock.client as never),
    "disabled platform operator must not be authorized"
  );
});

Deno.test("rejects a tenant profile because it is absent from the platform allowlist", async () => {
  const mock = createAdminClient(null);
  await assertRejects(
    () => authorizeAdmin(platformRequest(), mock.client as never),
    "tenant administrator membership must not authorize platform approval"
  );
});

async function assertRejects(operation: () => Promise<unknown>, message: string) {
  try {
    await operation();
  } catch {
    return;
  }
  throw new Error(message);
}
