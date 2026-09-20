import { NextRequest, NextResponse } from "next/server";

const BSCSCAN_API = "https://api-testnet.bscscan.com/api";
const CONTRACT = "0x736985ed65a72b1b44b572ff75eb52dd7d624ef9";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const apiKey = process.env.BSCSCAN_API_KEY ?? "";

  // Fetch normal (ERC-20 deposit/withdraw) transactions involving the vault contract
  const url = new URL(BSCSCAN_API);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", CONTRACT);
  url.searchParams.set("address", address);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 30 } });
    const json = await res.json();

    if (json.status !== "1") {
      // BscScan returns status "0" when no transactions exist — treat as empty
      return NextResponse.json({ transactions: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = json.result.map((tx: any) => {
      const isDeposit =
        tx.to.toLowerCase() === CONTRACT.toLowerCase();
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
    console.error("[txhistory] BscScan fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
