import React from "react";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import { Button } from "../ui/Button";

export function TopHeader() {
  return (
    <header className="top-header">
      <div>
        <div className="header-kicker">Evidence report</div>
        <div className="header-title">Candidate Evidence Report</div>
        <div className="header-subtitle">AI assists. Human decides. Evidence explains.</div>
      </div>
      <div className="header-actions" aria-label="Workspace actions">
        <label className="header-search" aria-label="Search evidence">
          <Search size={18} aria-hidden="true" />
          <input type="search" placeholder="Search evidence..." />
        </label>
        <button className="icon-button" aria-label="Help">
          <CircleHelp size={18} />
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <Button variant="secondary">Share report</Button>
        <Button>Final decision</Button>
      </div>
    </header>
  );
}
