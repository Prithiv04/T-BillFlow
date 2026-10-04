'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNetworkGuard } from '@/hooks/useNetworkGuard';
import { useAccount, useDisconnect } from 'wagmi';
import { ShieldCheck, AlertTriangle, LogOut, ArrowLeftRight } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isConnected } = useAccount();
  const { isCorrectNetwork } = useNetworkGuard();
  const { disconnect } = useDisconnect();

  const showNetworkWarning = isConnected && !isCorrectNetwork;

  const handleDisconnect = () => {
    try {
      disconnect();
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith('wagmi') ||
            key.startsWith('@wagmi') ||
            key.startsWith('rk-') ||
            key.includes('walletconnect')
          ) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum?.request) {
        await (window as any).ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (err) {
      console.error('Account switch error:', err);
    }
  };

  return (
    <header className="h-16 border-b border-[#1E2229] bg-[#0E1013]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-sm font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 font-mono">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Wrong network warning */}
        {showNetworkWarning && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Wrong network — switch to Arbitrum Sepolia</span>
          </div>
        )}

        {/* Protocol Network Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Arbitrum Sepolia</span>
        </div>

        {/* Wallet Connection & Account Controls */}
        <div className="flex items-center gap-2">
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

          {isConnected && (
            <>
              <button
                type="button"
                onClick={handleSwitchAccount}
                title="Switch MetaMask Account (Prompt Account Selector)"
                className="px-2.5 py-1.5 rounded-md bg-[#13171F] hover:bg-[#1C222E] border border-[#252A34] text-xs font-mono text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden md:inline">Switch Account</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                title="Disconnect Wallet and Clear Session"
                className="px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-mono text-rose-300 hover:text-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden md:inline">Disconnect</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
