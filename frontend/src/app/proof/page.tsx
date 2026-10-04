"use client";

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TechnicalDetailsDrawer } from '@/components/execution/TechnicalDetailsDrawer';
import { AuthorizationEligibilityCard } from '@/components/AuthorizationEligibilityCard';

export default function ProofPage() {
  return (
    <AppShell title="Proof & Verification" subtitle="Authorization vs Eligibility — On-chain Proof">
      <div className="grid gap-6">
        <AuthorizationEligibilityCard />
        <TechnicalDetailsDrawer />
      </div>
    </AppShell>
  );
}
