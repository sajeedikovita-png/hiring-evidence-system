import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./styles/workspace-shell.css";
import "./styles/report-workflow.css";
import "./styles/recruiter-operations.css";
import "./styles/pilot-lifecycle.css";
import "./styles/public-marketing.css";
import "./styles/editorial-system.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
