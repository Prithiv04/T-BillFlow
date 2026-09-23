"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AppShell } from "@/components/layout/AppShell";

const FAQS = [
  {
    q: "What is T-BillFlow 2.0?",
    a: "T-BillFlow 2.0 is an Arbitrum-native, RWA-aware agent execution layer. It bridges autonomous off-chain AI agents with tokenized Real-World Assets (such as US Treasury Bills) while enforcing the core principle: Authorization ≠ Eligibility.",
  },
  {
    q: "What does 'Authorization ≠ Eligibility' mean?",
    a: "An off-chain agent can hold valid delegated authority (signed via an EIP-712 mandate) to execute actions like deposits or allocations. However, if the underlying RWA condition is not eligible (e.g. NAV is stale, redemption is closed, or liquidity is insufficient), the on-chain AgentExecutionGate halts and reverts execution.",
  },
  {
    q: "What are the four core contracts?",
    a: "1. AgentMandateRegistry.sol (manages EIP-712 delegated authority, nonces, and cumulative caps). 2. RWAStateOracle.sol (tracks NAV price, freshness timestamps, redemption status, and liquidity tiers). 3. AgentExecutionGate.sol (the central execution boundary validating both authority and eligibility). 4. TBillVault.sol (ERC-4626 vault holding tokenized assets and minting shares).",
  },
  {
    q: "How does the autonomous agent operate?",
    a: "The agent (implemented in Python) continuously polls synthetic yield opportunities. When current opportunity yield exceeds the configured threshold (e.g. 5.0%), the agent queries RWAStateOracle and AgentMandateRegistry, verifies canExecute() on the gate, and submits the transaction. The agent never calls the vault directly.",
  },
  {
    q: "Is there physical custody of US Treasuries in this version?",
    a: "No. V1 uses a simulated tokenized-T-Bill environment (USTB) on Arbitrum Sepolia for transparent demonstration and hackathon validation. It does not represent custody of real U.S. Treasury securities.",
  },
  {
    q: "How do I verify executions on-chain?",
    a: "All gate decisions, whether allowed or blocked, emit on-chain events. Allowed executions create verifiable transaction hashes on Arbitrum Sepolia that can be inspected on Arbiscan.",
  },
];

export default function FaqPage() {
  return (
    <AppShell
      title="Architecture FAQ & Principles"
      subtitle="Institutional Architecture, Security Model & RWA Execution Boundaries"
    >
      <div className="panel max-w-3xl mx-auto p-6">
        <Accordion className="space-y-3">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-lg border border-[#1E2229] bg-[#0E1013] px-4 data-[state=open]:border-blue-500/40"
            >
              <AccordionTrigger className="text-left font-medium text-xs text-white hover:text-blue-400 hover:no-underline py-3.5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-gray-400 pb-3.5 leading-relaxed font-sans">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppShell>
  );
}
