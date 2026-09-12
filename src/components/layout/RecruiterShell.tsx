import React, { useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business.js";
import ClipboardCheck from "lucide-react/dist/esm/icons/clipboard-check.js";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard.js";
import UsersRound from "lucide-react/dist/esm/icons/users-round.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import LifeBuoy from "lucide-react/dist/esm/icons/life-buoy.js";
import Activity from "lucide-react/dist/esm/icons/activity.js";
import { Button } from "../../../components/ui/Button";
import { signOutRecruiter } from "../../services/authService";
import { createHiringSupabaseClient } from "../../services/supabaseClient";
import { hasSupabaseConfig } from "../../services/supabaseConfig";
import { SupportPanel } from "../support/SupportPanel";
import { buildSafeDiagnosticsPreview } from "../../services/supportService";

type RecruiterShellProps = {
  active: "dashboard" | "pilot" | "candidates" | "reports" | "privacy" | "support" | "access" | "paid-access" | "operations";
  title: string;
  subtitle: string;
  children: ReactNode;
  reviewerName?: string;
  primaryAction?: string;
  secondaryAction?: string;
  showAccessRequests?: boolean;
  showSignOut?: boolean;
  publicSample?: boolean;
  showHelp?: boolean;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "pilot", label: "Pilot access", href: "/pilot-access", icon: ClipboardCheck },
  { id: "candidates", label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
  { id: "privacy", label: "Privacy and data", href: "/workspace/privacy", icon: ShieldCheck },
  { id: "support", label: "Support", href: "/workspace/support", icon: LifeBuoy }
];

const platformNavItems = [
  { id: "access", label: "Access requests", href: "/admin/access-requests", icon: UsersRound },
  { id: "paid-access", label: "Ongoing access", href: "/admin/paid-access-requests", icon: ClipboardCheck },
  { id: "support", label: "Support inbox", href: "/admin/support", icon: LifeBuoy },
  { id: "operations", label: "Site operations", href: "/admin/operations", icon: Activity }
];

export function RecruiterShell({
  active,
  title,
  subtitle,
  children,
  reviewerName = "Reviewer",
  primaryAction,
  secondaryAction,
  showAccessRequests = false,
  showSignOut = true,
  publicSample = false,
  showHelp = true
}: RecruiterShellProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const navigate = useNavigate();
  const visibleNavItems = showAccessRequests ? platformNavItems : navItems;

  async function handleSignOut() {
    if (!hasSupabaseConfig()) {
      window.location.assign("/login");
      return;
    }
    setIsSigningOut(true);
    try {
      await signOutRecruiter(createHiringSupabaseClient());
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="recruiter-shell">
      <aside className="recruiter-sidebar">
        <Link className="workspace-brand" to={publicSample ? "/" : showAccessRequests ? "/admin/access-requests" : "/dashboard"}>
          <span className="brand-mark">HE</span>
          <span>
            <strong>Hiring Evidence</strong>
            <small>{publicSample ? "Public synthetic report" : "Company workspace"}</small>
          </span>
        </Link>
        <nav aria-label="Recruiter navigation">
          <ul className="workspace-nav">
            {publicSample ? (
              <li>
                <Link className="workspace-link" to="/">
                  <LayoutDashboard size={18} aria-hidden="true" />
                  <span>Back to product</span>
                </Link>
              </li>
            ) : visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === active;
              return (
                <li key={item.label}>
                  <Link className={isActive ? "workspace-link active" : "workspace-link"} to={item.href}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="reviewer-card">
          <strong>{reviewerName}</strong>
          <span>{publicSample ? "Public sample" : "Your workspace"}</span>
          <small>Final decisions stay with the hiring team.</small>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div>
            <p className="section-kicker">{publicSample ? "Synthetic evidence dossier" : "Recruiter review workspace"}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="workspace-actions">
            {!publicSample && showHelp ? <button className="workspace-help-entry" type="button" onClick={() => setIsHelpOpen(true)} aria-label="Ask the Hiring Evidence Guide">
              <img src="/illustrations/hiring-evidence-guide.png" alt="" aria-hidden="true" />
              <span><strong>Ask the Guide</strong><small>Answers &amp; examples</small></span>
            </button> : null}
            {showSignOut ? <button className="button button-secondary" type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>
              {isSigningOut ? "Signing out" : "Sign out"}
            </button> : null}
            {secondaryAction ? <Button variant="secondary">{secondaryAction}</Button> : null}
            {primaryAction ? <Button>{primaryAction}</Button> : null}
          </div>
        </header>
        {children}
      </div>
      {isHelpOpen ? <SupportPanel active={active} pageTitle={title} diagnostics={buildSafeDiagnosticsPreview({ pathname: window.location.pathname, pageTitle: title, repositorySource: "workspace", workspaceRole: showAccessRequests ? "platform administrator" : "workspace member" })} onClose={() => setIsHelpOpen(false)} onStartRequest={(type) => { setIsHelpOpen(false); navigate(showAccessRequests ? "/admin/support" : `/workspace/support?type=${type}`); }} /> : null}
    </div>
  );
}
