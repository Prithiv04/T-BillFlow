'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useMode } from '@/context/ModeContext';
import { useNetworkGuard } from '@/hooks/useNetworkGuard';
import { useAccount } from 'wagmi';
import { ShieldCheck, AlertCircle, Zap, FlaskConical, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { mode, setMode, isDemo } = useMode();
  const { isConnected } = useAccount();
  const { isCorrectNetwork } = useNetworkGuard();

  const showNetworkWarning = !isDemo && isConnected && !isCorrectNetwork;

  return (
    <header className="h-16 border-b border-[#1E2229] bg-[#0E1013]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-sm font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 font-mono">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">

        {/* Wrong network warning */}
        {showNetworkWarning && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Wrong network — switch to Arbitrum Sepolia</span>
          </div>
        )}

        {/* Demo/Live Mode Toggle */}
        <div className="hidden sm:flex items-center rounded-md border border-[#2A303A] bg-[#0E1013] p-0.5 gap-0.5">
          <button
            onClick={() => setMode('demo')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
              isDemo
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Demo mode — zero-gas simulated execution"
          >
            <FlaskConical className="h-3 w-3" />
            <span>Demo</span>
          </button>
          <button
            onClick={() => setMode('live')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
              !isDemo
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Live mode — real Arbitrum Sepolia contracts"
          >
            <Zap className="h-3 w-3" />
            <span>Live</span>
          </button>
        </div>

        {/* Environment Banner Pill */}
        {isDemo ? (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>SIMULATION — No gas used</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>LIVE — Arbitrum Sepolia</span>
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
