import assert from "node:assert/strict";

import { getDemoTrialStatus } from "../src/services/demoTrialService";

const activatedAt = new Date("2026-07-01T09:00:00.000Z");

const pending = getDemoTrialStatus({ activatedAt: null, now: activatedAt });
assert.equal(pending.state, "pending_activation");

const active = getDemoTrialStatus({ activatedAt, now: new Date("2026-07-14T09:00:00.000Z") });
assert.equal(active.state, "active");
assert.equal(active.daysRemaining, 1);

const readOnly = getDemoTrialStatus({ activatedAt, now: new Date("2026-07-15T09:00:00.000Z") });
assert.equal(readOnly.state, "read_only");
assert.equal(readOnly.daysRemaining, 7);

const expired = getDemoTrialStatus({ activatedAt, now: new Date("2026-07-22T09:00:00.000Z") });
assert.equal(expired.state, "purge_due");

console.log("Demo trial lifecycle tests passed.");
