"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  FileCheck2,
  Database,
  Bot,
  History,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useMode } from '@/context/ModeContext';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Portfolio', href: '/portfolio', icon: Wallet },
  { label: 'Mandates', href: '/mandates', icon: FileCheck2 },
  { label: 'RWA Assets', href: '/rwa', icon: Database },
  { label: 'Agent', href: '/agent', icon: Bot },
  { label: 'Executions', href: '/executions', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const { toggleMode, isDemo } = useMode();

  return (
    <aside className="w-64 border-r border-[#1E2229] bg-[#0E1013] flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1E2229]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-base">
              TB
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                T-BillFlow
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono">
                  2.0
                </span>
              </div>
              <div className="text-[10px] font-mono tracking-wider text-gray-500 uppercase mt-0.5">
                RWA Execution Infra
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Operations
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/overview'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#181B20] text-white border border-[#2A303A]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#14161A]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="h-3 w-3 text-gray-500" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Mode & Network Controls */}
      <div className="p-4 border-t border-[#1E2229] space-y-3 bg-[#0A0B0D]/50">
        {/* Mode Selector Pill */}
        <div className="p-2.5 rounded-lg border border-[#1E2229] bg-[#121418]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-gray-500" />
              Runtime Mode
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${
                isDemo
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {isDemo ? 'DEMO' : 'LIVE'}
            </span>
          </div>

          <button
            onClick={toggleMode}
            className="w-full py-1.5 px-2 rounded text-[11px] font-medium bg-[#1A1D23] hover:bg-[#20242B] border border-[#2A303A] text-gray-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Switch to {isDemo ? 'Live Mode' : 'Demo Mode'}</span>
          </button>
        </div>

        {/* Network Status Badge */}
        <div className="flex items-center justify-between px-2 text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Arbitrum Sepolia</span>
          </div>
          <span className="text-[10px] text-gray-600">421614</span>
        </div>
      </div>
    </aside>
  );
}
