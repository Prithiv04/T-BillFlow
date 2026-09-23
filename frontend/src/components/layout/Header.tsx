"use client";

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useMode } from '@/context/ModeContext';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isDemo } = useMode();

  return (
    <header className="h-16 border-b border-[#1E2229] bg-[#0E1013]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-sm font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 font-mono">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Environment Banner Pill */}
        {isDemo ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>DEMO MODE — Zero-gas simulated execution</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>LIVE MODE — Arbitrum Sepolia</span>
          </div>
        )}

        {/* Wallet Connection */}
        <div className="scale-90 origin-right">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>
    </header>
  );
}
