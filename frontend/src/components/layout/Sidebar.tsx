"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileCheck2, Database, Landmark, Activity, ShieldCheck, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview',    href: '/',          icon: LayoutDashboard },
  { label: 'Mandates',    href: '/mandates',   icon: FileCheck2 },
  { label: 'RWA State',   href: '/rwa',        icon: Database },
  { label: 'Vault',       href: '/vault',      icon: Landmark },
  { label: 'Activity',    href: '/activity',   icon: Activity },
  { label: 'Proof',       href: '/proof',      icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[#1E2229] bg-[#0E1013] flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        <div className="p-5 border-b border-[#1E2229]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#28A0F0] to-[#0A2540] border border-[#28A0F0]/40 flex items-center justify-center font-bold text-white text-base shadow-sm">
              TB
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                T-BillFlow
              </div>
              <div className="text-[10px] font-mono tracking-wider text-gray-400 uppercase mt-0.5">Arbitrum RWA Layer</div>
            </div>
          </Link>
        </div>

        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">Protocol Controls</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/overview'
                : pathname?.startsWith(item.href) ||
                  (item.href === '/vault' && pathname?.startsWith('/portfolio')) ||
                  (item.href === '/activity' && (pathname?.startsWith('/executions') || pathname?.startsWith('/agent')));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={"flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all " + (isActive ? 'bg-[#182338] text-white border border-[#28A0F0]/40 shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-[#14161A]')}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={"h-4 w-4 " + (isActive ? 'text-[#28A0F0]' : 'text-gray-500')} />
                  <span className={isActive ? 'font-semibold text-[#F5F7FA]' : ''}>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="h-3 w-3 text-[#28A0F0]" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#1E2229] bg-[#0A0B0D]/50">
        <div className="flex items-center justify-between px-2 text-[11px] text-gray-300 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00E340] animate-pulse" />
            <span>Arbitrum Sepolia</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">421614</span>
        </div>
      </div>
    </aside>
  );
}
