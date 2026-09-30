import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { PilotTestingContent } from "../src/pages/PilotTestingPage";

const html = renderToStaticMarkup(
  <MemoryRouter>
    <PilotTestingContent
      companyName="Example Pilot Company"
      lifecycle={{
        state: "active",
        isWritable: true,
        remainingDays: 21,
        limits: { roles: 2, candidateDocuments: 50, users: 2 },
        usage: { roles: 1, candidateDocuments: 4, users: 2 }
      }}
    />
  </MemoryRouter>
);
assert.match(html,/Pilot tester checklist/);
assert.match(html,/Example Pilot Company/);
assert.match(html,/1<\/b> \/ 2 roles/);
assert.match(html,/Second reviewer collaboration/);
assert.match(html,/Company isolation/);
assert.match(html,/Access lifecycle/);
assert.match(html,/Audited company transfer/);
assert.match(html,/URLs are not fetched automatically/);
assert.match(html,/Password recovery reached the controlled Gmail inbox/);
assert.match(html,/Invitation delivery across customer mail providers/);
assert.doesNotMatch(html,/service_role|qa\.isolation\.admin/i);
console.log("Pilot testing page tests passed.");
