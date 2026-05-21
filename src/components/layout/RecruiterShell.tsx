import React from "react";
import type { ReactNode } from "react";
import Bell from "lucide-react/dist/esm/icons/bell.js";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business.js";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.js";
import ClipboardCheck from "lucide-react/dist/esm/icons/clipboard-check.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import UsersRound from "lucide-react/dist/esm/icons/users-round.js";
import { Button } from "../../../components/ui/Button";

type RecruiterShellProps = {
  active: "dashboard" | "candidates" | "reports";
  title: string;
  subtitle: string;
  children: ReactNode;
  primaryAction?: string;
  secondaryAction?: string;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "jobs", label: "Jobs", href: "/dashboard", icon: BriefcaseBusiness },
  { id: "candidates", label: "Candidates", href: "/reports/candidate-evidence", icon: UsersRound },
  { id: "reports", label: "Reports", href: "/reports/candidate-evidence", icon: FileText },
  { id: "fairness", label: "Fairness checks", href: "/dashboard", icon: ShieldCheck },
  { id: "decisions", label: "Decisions", href: "/dashboard", icon: ClipboardCheck },
  { id: "settings", label: "Settings", href: "/dashboard", icon: Settings }
];

export function RecruiterShell({ active, title, subtitle, children, primaryAction, secondaryAction }: RecruiterShellProps) {
  return (
    <div className="recruiter-shell">
      <aside className="recruiter-sidebar">
        <a className="workspace-brand" href="/dashboard">
          <span className="brand-mark">HE</span>
          <span>
            <strong>Evidence Ledger</strong>
            <small>Recruiter Workspace</small>
          </span>
        </a>
        <nav aria-label="Recruiter navigation">
          <ul className="workspace-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <li key={item.label}>
                  <a className={isActive ? "workspace-link active" : "workspace-link"} href={item.href}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="reviewer-card">
          <strong>Sarah Tan</strong>
          <span>Assigned reviewer</span>
          <small>Final decisions stay with the hiring team.</small>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div>
            <p className="section-kicker">AI assists. Human decides. Evidence explains.</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="workspace-actions">
            <label className="header-search" aria-label="Search evidence">
              <Search size={18} aria-hidden="true" />
              <input type="search" placeholder="Search evidence..." />
            </label>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="icon-button" aria-label="Help">
              <CircleHelp size={18} />
            </button>
            {secondaryAction ? <Button variant="secondary">{secondaryAction}</Button> : null}
            {primaryAction ? <Button>{primaryAction}</Button> : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
