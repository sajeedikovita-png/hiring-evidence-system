import React, { useEffect, useState } from "react";
import { ClientHandoffDocument } from "../components/report/ClientHandoffDocument";
import { clientHandoffStyles } from "../components/report/clientHandoffStyles";
import { readClientReportShare } from "../services/clientReportShareService";

type SharedReport = NonNullable<Awaited<ReturnType<typeof readClientReportShare>>>;
export function SharedClientReportState({ state, report }: { state: "loading" | "unavailable" | "ready"; report?: SharedReport }) {
  if (state === "loading") return <main className="public-info-page"><h1>Opening client summary</h1><p role="status">Checking the link and its access period…</p></main>;
  if (state !== "ready" || !report) return <main className="public-info-page"><h1>Summary unavailable</h1><p role="status">This link may be invalid, expired, or revoked. Ask the recruiter for a new summary link.</p></main>;
  return <main className="client-shared-page"><style>{clientHandoffStyles}{`@media print{.client-shared-notice{display:none}.client-shared-page{padding:0!important}}`}</style><div className="client-shared-notice"><h1>Shared evidence summary</h1><p>Read-only snapshot. Human review required. Link expires {new Date(report.expiresAt).toLocaleString()}.</p><button className="button button-secondary" onClick={() => window.print()}>Print / save PDF</button></div><ClientHandoffDocument summary={report.summary} /></main>;
}
export function SharedClientReportPage() {
  const [state, setState] = useState<"loading" | "unavailable" | "ready">("loading");
  const [report, setReport] = useState<SharedReport>();
  useEffect(() => {
    let alive = true;
    let requestNumber = 0;
    const load = async (background = false) => {
      const currentRequest = ++requestNumber;
      if (!background) { setState("loading"); setReport(undefined); }
      let token: string;
      try { token = decodeURIComponent(window.location.hash.slice(1)); } catch { setState("unavailable"); return; }
      if (!token || token.length > 512) { setState("unavailable"); return; }
      try {
        const result = await readClientReportShare(token);
        if (!alive || currentRequest !== requestNumber) return;
        if (result && new Date(result.expiresAt).getTime() > Date.now()) { setReport(result); setState("ready"); }
        else { setReport(undefined); setState("unavailable"); }
      } catch { if (alive && currentRequest === requestNumber) { setReport(undefined); setState("unavailable"); } }
    };
    void load();
    const hashChanged = () => { void load(); };
    const revalidate = () => { if (document.visibilityState === "visible") void load(true); };
    window.addEventListener("hashchange", hashChanged);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    const interval = window.setInterval(revalidate, 30_000);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("hashchange", hashChanged);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, []);
  useEffect(() => {
    if (!report) return;
    let timeout: number;
    const expire = () => {
      const remaining = new Date(report.expiresAt).getTime() - Date.now();
      if (remaining <= 0) { setReport(undefined); setState("unavailable"); }
      else timeout = window.setTimeout(expire, Math.min(remaining, 2_147_483_647));
    };
    expire();
    return () => window.clearTimeout(timeout);
  }, [report]);
  return <SharedClientReportState state={state} report={report} />;
}
