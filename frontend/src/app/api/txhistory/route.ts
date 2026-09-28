import { NextRequest, NextResponse } from "next/server";

// Arbitrum Sepolia — Arbiscan API
const ARBISCAN_API = "https://api-sepolia.arbiscan.io/api";
const TBILL_VAULT_ADDRESS = "0x2f9453ece66d76431e3acbe33770c60d79adcda5";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const apiKey = process.env.ARBISCAN_API_KEY ?? "";

  // Fetch ERC-20 token transfer events involving the TBillVault contract
  const url = new URL(ARBISCAN_API);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", TBILL_VAULT_ADDRESS);
  url.searchParams.set("address", address);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 30 } });
    const json = await res.json();

    if (json.status !== "1") {
      // Arbiscan returns status "0" when no transactions exist — treat as empty
      return NextResponse.json({ transactions: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = json.result.map((tx: any) => {
      const isDeposit =
        tx.to.toLowerCase() === TBILL_VAULT_ADDRESS.toLowerCase();
      return {
        type: isDeposit ? "Deposit" : "Withdraw",
        amount: (Number(tx.value) / 1e18).toFixed(4),
        hash: tx.hash,
        date: new Date(Number(tx.timeStamp) * 1000)
          .toISOString()
          .split("T")[0],
        tokenSymbol: tx.tokenSymbol,
      };
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[txhistory] Arbiscan fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
