"use client";

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TransactionHistory } from '@/components/TransactionHistory';

export default function ActivityPage() {
  return (
    <AppShell title="Activity" subtitle="On-chain Execution History">
      <TransactionHistory />
    </AppShell>
  );
}
