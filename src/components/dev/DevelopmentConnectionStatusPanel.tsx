import React from "react";
import { Badge } from "../../../components/ui/Badge";
import type { DevelopmentConnectionStatus } from "../../services/connectionStatusService";

type DevelopmentConnectionStatusPanelProps = {
  status: DevelopmentConnectionStatus;
};

function isDevelopmentRuntime() {
  const viteEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean; MODE?: string } }).env;
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;

  return viteEnv?.PROD !== true && viteEnv?.MODE !== "production" && nodeEnv !== "production";
}

export function DevelopmentConnectionStatusPanel({ status }: DevelopmentConnectionStatusPanelProps) {
  if (!isDevelopmentRuntime()) return null;

  return (
    <aside className="dev-connection-panel" aria-label="Development backend connection status">
      <div>
        <p className="section-kicker">Development backend</p>
        <h2>{status.modeLabel}</h2>
        <p>{status.detail}</p>
      </div>
      <Badge tone={status.tone}>{status.issueLabel}</Badge>
    </aside>
  );
}
