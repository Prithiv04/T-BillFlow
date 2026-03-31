import Link from "next/link";
import { ArrowRight, Shield, TrendingUp, Zap, ExternalLink } from "lucide-react";
import { BSCSCAN_BASE, TBILLFLOW_CONTRACT, APY } from "@/lib/constants";
import LiveStats from "@/components/LiveStats";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-16 text-center overflow-hidden">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-[#F0B90B]/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F0B90B]/30 bg-[#F0B90B]/10 px-4 py-1.5 text-sm text-[#F0B90B]">
            <span className="h-2 w-2 rounded-full bg-[#F0B90B] animate-pulse" />
            Live on BNB Chain · Currently earning{" "}
            <strong>{APY}% APY</strong>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
            The{" "}
            <span className="text-gradient">Safest Yield</span>
            <br />
            in DeFi
          </h1>

          <p className="mb-10 max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed">
            Deposit tBUSD and automatically earn <strong className="text-white">5% APY</strong> from
            tokenized US Treasury Bills. Institutional-grade yield, accessible to everyone
            on BNB Chain.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/deposit"
              className="inline-flex items-center gap-2 rounded-xl gradient-gold px-8 py-4 text-base font-semibold text-[#1E1E1E] transition-opacity hover:opacity-90 gold-glow"
            >
              Start Earning <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`${BSCSCAN_BASE}/address/${TBILLFLOW_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A3E] bg-white/5 px-8 py-4 text-base font-medium text-gray-300 transition-colors hover:border-[#F0B90B]/50 hover:text-white"
            >
              View Contract <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 mt-20 w-full max-w-3xl">
          <LiveStats />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-bold">How It Works</h2>
          <p className="mb-14 text-center text-gray-400">
            Three simple steps to institutional-grade yield
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Deposit tBUSD",
                desc: "Connect your MetaMask wallet and deposit tBUSD into the T-BillFlow vault on BNB Chain.",
                icon: <Zap className="h-6 w-6 text-[#F0B90B]" />,
              },
              {
                step: "02",
                title: "Receive Shares",
                desc: "You instantly receive T-BillFlow Shares — BEP-20 tokens that grow in value as Treasury Bill yields accrue.",
                icon: <TrendingUp className="h-6 w-6 text-[#F0B90B]" />,
              },
              {
                step: "03",
                title: "Watch Yield Grow",
                desc: "Your shares appreciate in real-time. Redeem anytime or trade them on PancakeSwap.",
                icon: <Shield className="h-6 w-6 text-[#F0B90B]" />,
              },
            ].map((item) => (
              <div key={item.step} className="card-glass rounded-2xl p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0B90B]/10">
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono text-[#F0B90B]">Step {item.step}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="border-t border-[#2A2A3E] py-16 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-8 text-sm text-gray-500 uppercase tracking-widest">
            Secured &amp; Audited
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500">
            <span className="font-semibold">BNB Chain</span>
            <span>·</span>
            <span className="font-semibold">PancakeSwap</span>
            <span>·</span>
            <span className="font-semibold">Chainlink Oracles</span>
            <span>·</span>
            <a
              href={`${BSCSCAN_BASE}/address/${TBILLFLOW_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:text-[#F0B90B] transition-colors"
            >
              BscScan Verified <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
