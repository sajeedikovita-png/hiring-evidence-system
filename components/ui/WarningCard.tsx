import React from "react";
import type { ReactNode } from "react";
import AlertTriangle from "lucide-react/dist/esm/icons/triangle-alert.js";

type WarningCardProps = {
  title: string;
  children: ReactNode;
};

export function WarningCard({ title, children }: WarningCardProps) {
  return (
    <aside className="warning-card" role="note">
      <AlertTriangle size={20} aria-hidden="true" />
      <div>
        <h2 className="warning-title">{title}</h2>
        <p className="muted">{children}</p>
      </div>
    </aside>
  );
}
