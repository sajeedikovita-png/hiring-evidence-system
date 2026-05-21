import React from "react";
import { CandidateEvidenceReportPage } from "./pages/CandidateEvidenceReportPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";

type AppProps = {
  path?: string;
};

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

export function App({ path = getCurrentPath() }: AppProps = {}) {

  if (path === "/login") return <LoginPage />;
  if (path === "/dashboard") return <DashboardPage />;
  if (path === "/reports/candidate-evidence") return <CandidateEvidenceReportPage />;
  return <LandingPage />;
}
