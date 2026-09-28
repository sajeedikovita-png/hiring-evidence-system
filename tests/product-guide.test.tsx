import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ProductGuidePage } from "../src/pages/ProductGuidePage";
import { getProductGuideContent, type ProductGuidePageKey } from "../src/services/productGuideContent";
import { containsForbiddenHiringLanguage } from "../src/services/compliance";
import { App } from "../src/App";

const pages: ProductGuidePageKey[] = ["product", "evidence-review", "agencies", "hiring-teams", "resources"];
const titles = new Set<string>();
for (const page of pages) {
  const content = getProductGuideContent(page);
  titles.add(content.title);
  const html = renderToStaticMarkup(<MemoryRouter><ProductGuidePage page={page} /></MemoryRouter>);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /href="\/request-pilot"/);
  assert.match(html, /href="\/reports\/candidate-evidence"/);
  assert.match(html, /href="\/pilot-terms"/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /Synthetic material for explanation/);
  assert.match(html, /<details><summary>/, "FAQs remain keyboard-operable native disclosures");
  assert.match(html, /Do not include candidate information in the public request/);
  assert.equal(containsForbiddenHiringLanguage(JSON.stringify(content)), false);
  assert.doesNotMatch(JSON.stringify(content), /automatically verifies|guaranteed compliance|government approved|drag.and.drop pipeline/i);
}
assert.equal(titles.size, pages.length, "Each audience has a distinct page");
assert.match(JSON.stringify(getProductGuideContent("agencies")), /anyone holding the link/i);
assert.match(JSON.stringify(getProductGuideContent("agencies")), /no named-recipient sign-in/);
assert.match(JSON.stringify(getProductGuideContent("evidence-review")), /pasted text/);
assert.match(JSON.stringify(getProductGuideContent("product")), /does not independently search the web or read the URL/);
assert.match(JSON.stringify(getProductGuideContent("hiring-teams")), /hiring manager/);
assert.match(JSON.stringify(getProductGuideContent("resources")), /Criteria writing prompt/);
for (const [path, page] of [["/product", "product"], ["/product/evidence-review", "evidence-review"], ["/solutions/recruitment-agencies", "agencies"], ["/solutions/hiring-teams", "hiring-teams"], ["/resources", "resources"]] as const) {
  const routed = renderToStaticMarkup(<App path={path} />);
  assert.ok(routed.includes(getProductGuideContent(page).title), `Route ${path} should render its own content`);
  assert.match(routed, /aria-controls="public-navigation"/);
  assert.match(routed, /aria-expanded="false"/);
}
console.log("Product guide page tests passed.");
