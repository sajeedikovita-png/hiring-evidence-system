import React from "react";
import Inbox from "lucide-react/dist/esm/icons/inbox.js";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        <Inbox size={22} />
      </div>
      <div>
        <h2 className="empty-title">{title}</h2>
        <p className="muted">{description}</p>
      </div>
    </div>
  );
}
