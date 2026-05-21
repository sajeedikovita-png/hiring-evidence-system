import React from "react";
import type { ReactNode } from "react";
import { TopHeader } from "./TopHeader";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <TopHeader />
        {children}
      </div>
    </div>
  );
}
