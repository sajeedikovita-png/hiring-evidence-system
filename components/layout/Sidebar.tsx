import React from "react";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business.js";
import ClipboardCheck from "lucide-react/dist/esm/icons/clipboard-check.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import UsersRound from "lucide-react/dist/esm/icons/users-round.js";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Jobs", icon: BriefcaseBusiness },
  { label: "Candidates", icon: UsersRound, active: true },
  { label: "Reports", icon: FileText },
  { label: "Fairness checks", icon: ShieldCheck },
  { label: "Decisions", icon: ClipboardCheck },
  { label: "Settings", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand" aria-label="Hiring Evidence System">
        <div className="brand-mark" aria-hidden="true">
          HE
        </div>
        <div>
          <div className="brand-title">Recruiter Workspace</div>
          <div className="brand-subtitle">Hiring Evidence System</div>
        </div>
      </div>

      <nav aria-label="Main navigation">
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <a className={`nav-link${item.active ? " active" : ""}`} href="#">
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <strong>Sarah Tan</strong>
        <span>Assigned reviewer</span>
        <small>Final decisions stay with the hiring team.</small>
      </div>
    </aside>
  );
}
