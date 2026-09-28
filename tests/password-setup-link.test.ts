import assert from "node:assert/strict";
import { readPasswordSetupLink, verifyPasswordSetupLink } from "../src/services/authService";

assert.deepEqual(readPasswordSetupLink("https://hiringevidence.com/set-password?token_hash=abc123&type=recovery"), { tokenHash: "abc123", type: "recovery" });
assert.deepEqual(readPasswordSetupLink("https://hiringevidence.com/set-password?token_hash=invite123&type=invite"), { tokenHash: "invite123", type: "invite" });
assert.equal(readPasswordSetupLink("https://hiringevidence.com/set-password?token_hash=x&type=email"), null);
assert.equal(readPasswordSetupLink("https://hiringevidence.com/set-password?type=recovery"), null);

async function run() {
let received: unknown;
await verifyPasswordSetupLink({
  auth: {
    signInWithPassword: async () => ({ data: { user: null }, error: null }),
    verifyOtp: async (params) => {
      received = params;
      return { data: { user: { id: "user-1" } }, error: null };
    }
  }
}, { tokenHash: "abc123", type: "recovery" });
assert.deepEqual(received, { token_hash: "abc123", type: "recovery" });

await assert.rejects(
  verifyPasswordSetupLink({
    auth: {
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      verifyOtp: async () => ({ data: { user: null }, error: { message: "Token has expired" } })
    }
  }, { tokenHash: "expired", type: "invite" }),
  /Token has expired/
);

console.log("password setup link tests passed");
}

void run();
