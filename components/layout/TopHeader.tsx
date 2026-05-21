import React from "react";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import CircleUserRound from "lucide-react/dist/esm/icons/circle-user-round.js";
import Search from "lucide-react/dist/esm/icons/search.js";

export function TopHeader() {
  return (
    <header className="top-header">
      <div>
        <div className="header-kicker">Recruiter workspace</div>
        <div className="header-title">AI assists. Human decides.</div>
      </div>
      <div className="header-actions" aria-label="Workspace actions">
        <button className="icon-button" aria-label="Search">
          <Search size={18} />
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button className="icon-button" aria-label="Account">
          <CircleUserRound size={20} />
        </button>
      </div>
    </header>
  );
}
