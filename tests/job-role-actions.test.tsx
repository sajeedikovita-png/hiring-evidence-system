import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { JobRoleActions } from "../src/pages/JobsPage";
import { WorkflowHubContent } from "../src/pages/WorkflowHubPage";

function render(status: "open" | "closed" | undefined, confirming = false) {
  return renderToStaticMarkup(<MemoryRouter><JobRoleActions job={{ id: "role-1", title: "Engineer", department: "Engineering", candidates: "2 candidates", status }} busy={false} confirming={confirming} onRequest={() => {}} onCancel={() => {}} onConfirm={() => {}} /></MemoryRouter>);
}

test("closed role keeps candidate access but never offers upload", () => {
  const html = render("closed");
  assert.match(html, /href="\/jobs\/role-1\/candidates"/);
  assert.match(html, /href="\/jobs\/role-1\/workflow"/);
  assert.match(html, /Workflow board/);
  assert.match(html, /Reopen role/);
  assert.doesNotMatch(html, /candidates\/upload|>Upload</);
});

test("closing confirmation makes retention and unchanged hiring decisions explicit", () => {
  const html = render("open", true);
  assert.match(html, /Candidate records and reports stay available/);
  assert.match(html, /does not change any hiring decision/);
  assert.match(html, /Confirm close/);
  assert.match(html, /Cancel/);
});

test("reopening confirmation warns that plan capacity applies", () => {
  const html = render("closed", true);
  assert.match(html, /subject to your plan limit/);
  assert.match(html, /Confirm reopen/);
});

test("legacy rows without optional status preserve existing upload access", () => {
  assert.match(render(undefined), /href="\/jobs\/role-1\/candidates\/upload"/);
});

test("workflow hub makes ownership work a primary role action", () => {
  const html = renderToStaticMarkup(<MemoryRouter><WorkflowHubContent jobs={[{ id: "role-1", status: "open", title: "Engineer", department: "Engineering", candidates: "2 candidates", evidenceStatus: { label: "2 reports ready", tone: "success" }, lastUpdated: "Today", candidateListPath: "/jobs/role-1/candidates", uploadPath: "/jobs/role-1/candidates/upload" }]} /></MemoryRouter>);
  assert.match(html, /See who owns each candidate/);
  assert.match(html, /href="\/jobs\/role-1\/workflow"/);
  assert.match(html, /Open workflow board/);
  assert.match(html, /who made earlier workflow changes/);
});
