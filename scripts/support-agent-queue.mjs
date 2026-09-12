#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function envValue(name) {
  for (const file of [".env.local",".env"]) {
    try { const line=readFileSync(file,"utf8").split(/\r?\n/).find((line)=>line.startsWith(`${name}=`)); if (line) return line.slice(name.length+1).trim().replace(/^['\"]|['\"]$/g,""); } catch {}
  }
  return process.env[name] ?? "";
}
function token() {
  if (process.env.SUPPORT_AGENT_TOKEN) return process.env.SUPPORT_AGENT_TOKEN;
  try { return execFileSync("security",["find-generic-password","-s","hiring-evidence-support-agent","-w"],{encoding:"utf8"}).trim(); }
  catch { throw new Error("Support agent token is unavailable in the environment or macOS Keychain."); }
}
const action=process.argv[2];
if (!action || !["claim","heartbeat","update"].includes(action)) throw new Error("Use: node scripts/support-agent-queue.mjs claim | heartbeat <claim.json> | update <report.json>");
const base=envValue("VITE_SUPABASE_URL");
if (!base) throw new Error("VITE_SUPABASE_URL is missing.");
let body={action};
if (action==="heartbeat") { const file=process.argv[3]; if (!file) throw new Error("A claim JSON file is required."); const claim=JSON.parse(readFileSync(file,"utf8")); body={action,jobId:claim.jobId,claimToken:claim.claimToken}; }
if (action==="update") { const file=process.argv[3]; if (!file) throw new Error("A report JSON file is required."); body={action,report:JSON.parse(readFileSync(file,"utf8"))}; }
const response=await fetch(`${base}/functions/v1/support-agent-queue`,{method:"POST",headers:{"content-type":"application/json","x-support-agent-token":token()},body:JSON.stringify(body)});
const result=await response.json();
if (!response.ok) throw new Error(`${result.error ?? "REQUEST_FAILED"}: ${result.detail ?? response.status}`);
process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
