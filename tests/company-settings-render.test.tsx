import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CompanySettingsPreviewFixture } from "../src/pages/CompanySettingsPage";
import { App } from "../src/App";

const preview=renderToStaticMarkup(<CompanySettingsPreviewFixture/>);
assert.match(preview,/Northstar Search/);
assert.match(preview,/Candidate evidence summary/);
assert.match(preview,/Live preview/);
assert.match(preview,/AI assists\. Human decides\. Evidence explains\./);
assert.doesNotMatch(preview,/best candidate/i);

const routes=renderToStaticMarkup(<App path="/workspace/company"/>);
assert.match(routes,/Checking workspace access|Workspace access required|Company settings/);
console.log("Company settings render tests passed.");
