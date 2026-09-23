"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({
  children,
  title = "Overview",
  subtitle = "Arbitrum-Native RWA-Aware Agent Execution Layer"
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#0A0B0D] text-gray-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
