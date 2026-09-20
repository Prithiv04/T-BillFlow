import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink } from "lucide-react";
import { BSCSCAN_BASE, TBILLFLOW_CONTRACT, APY } from "@/lib/constants";

const FAQS = [
  {
    q: "What are T-BillFlow Shares?",
    a: "When you deposit tBUSD into the vault, you receive T-BillFlow Shares — BEP-20 tokens on BNB Chain. These shares represent your proportional ownership in the underlying US Treasury Bill portfolio. Unlike interest-bearing tokens that accumulate tokens in your wallet, your shares simply grow in value over time.",
  },
  {
    q: "How does the yield accrue?",
    a: `The yield is not paid out as new tokens — instead, the value of your T-BillFlow Shares increases relative to tBUSD. The protocol targets ${APY}% APY, which mirrors current short-term US Treasury Bill rates. When you eventually redeem your shares, you receive more tBUSD than you deposited.`,
  },
  {
    q: "Can I trade my shares on PancakeSwap?",
    a: "Yes! T-BillFlow Shares are standard BEP-20 tokens and are fully composable. You can provide liquidity or swap them instantly on PancakeSwap without waiting for the protocol's own withdrawal period. This means you can exit your position at any time at market price.",
  },
  {
    q: "What is the current exchange rate between tBUSD and Shares?",
    a: "The exchange rate starts at 1 Share = 1 tBUSD and increases as yield accrues. You can always check the current rate on the Deposit page or the Dashboard. The rate is calculated directly from the on-chain vault contract and is updated every block.",
  },
  {
    q: "Is my money safe?",
    a: "T-BillFlow smart contracts are open-source and verified on BscScan. The underlying assets are held by a bankruptcy-remote legal entity invested strictly in short-duration US Treasury Bills — the safest asset class in the world. Smart contract risk is mitigated through third-party audits.",
  },
  {
    q: "Why BNB Chain?",
    a: "BNB Chain provides the ideal combination of security, liquidity, and low transaction fees. Gas fee barriers on Ethereum make small deposits uneconomical. BNB Chain makes institutional-grade yield accessible to retail users with deposits starting from ~$10.",
  },
  {
    q: "How do I verify transactions on-chain?",
    a: "Every deposit and withdrawal generates a verifiable on-chain transaction. You can view all transactions, the vault contract, and token holders directly on BscScan. Links to relevant pages are available throughout the T-BillFlow interface.",
  },
  {
    q: "What happens if I want to exit quickly?",
    a: "You have two options: (1) Use the Withdraw page to redeem shares directly from the vault — usually processed within 1–2 blocks. (2) Sell your shares instantly on PancakeSwap at the current market price, which may vary slightly from the vault exchange rate.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-400">
            Everything you need to know about T-BillFlow and tokenized US Treasury Bills on BNB Chain.
          </p>
        </div>

        <Accordion className="space-y-3">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="card-glass rounded-xl border-[#2A2A3E] px-6 data-[state=open]:border-[#F0B90B]/30"
            >
              <AccordionTrigger className="text-left font-medium hover:text-[#F0B90B] hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contract footer */}
        <div className="mt-12 card-glass rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-3">
            Still have questions? Verify everything on-chain yourself.
          </p>
          <a
            href={`${BSCSCAN_BASE}/address/${TBILLFLOW_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10 px-6 py-3 text-sm font-medium text-[#F0B90B] hover:bg-[#F0B90B]/20 transition-colors"
          >
            View Vault Contract on BscScan <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
