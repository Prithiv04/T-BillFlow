# T-BillFlow: Frontend Implementation Plan

## 1. Multi-Page Architecture

T-BillFlow is designed with a hybrid public/private architecture. Unauthenticated users see the public marketing pages, while authenticated users access the Web3 application dashboard.

- **Landing / Home Page**: The public face of T-BillFlow. Focuses on value proposition, trust signals, and clear call-to-actions to connect a wallet.
- **Dashboard (Connected View)**: The main hub for authenticated users. Provides a high-level overview of the protocol's stats and the user's quick actions.
- **Deposit / Withdraw Page**: The primary interaction interface where users mint shares by depositing tBUSD or burn shares to withdraw tBUSD.
- **Portfolio / My Holdings Page**: A detailed breakdown of the user's performance, historical yield, and transaction history.
- **FAQ / Knowledge Base**: Educational hub to explain the mechanics of tokenized T-Bills, mitigating user hesitation.
- **Proof of Reserves (Suggested Addition)**: A dedicated page pulling on-chain data to prove that the BNB Chain tokens are fully backed by off-chain real-world US Treasury Bills. Crucial for institutional-grade trust.

---

## 2. Feature Descriptions per Page

### Landing / Home Page
- **Hero Section**: Strong headline ("OndoFinance for BNB Retail"), live APY ticker (e.g., "Currently earning 5.01%"), and a prominent "Connect Wallet" CTA.
- **How It Works**: A simple 3-step visual guide (1. Deposit tBUSD -> 2. Receive T-BillFlow Shares -> 3. Watch Yield Accrue).
- **Trust Banner**: Logos of BNB Chain, audited by [Firm], and links to BscScan for the vault contract.

### Dashboard
- **TVL & Protocol APY**: Real-time display of Total Value Locked and the current yield rate.
- **Quick Actions**: "Deposit" and "Withdraw" buttons leading to the interaction pages.
- **Yield Ticker**: A live, subtly animating counter showing the user's absolute yield earned in real-time.

### Deposit / Withdraw Page
- **Toggle Interface**: A simple switch between "Deposit" and "Withdraw" modes.
- **Input Form**: Enter tBUSD amount. Includes "Max" button and shows the estimated T-BillFlow shares to be received based on the current exchange rate.
- **Exchange Rate Display**: Displays the current conversion rate (e.g., `1 Share = 1.050 tBUSD`) which grows over time.
- **Transaction Details**: Gas fee estimation (in BNB) and expected yield over 1 year based on the deposit amount.

### Portfolio / My Holdings Page
- **Balance Card**: Total USD value of shares held, total shares held, and total historical yield earned.
- **Yield Performance Chart**: A simple line graph showing portfolio growth over 7D/30D/ALL or yield earned over time.
- **Transaction History**: A table showing all past deposits and withdrawals, with status and localized timestamps.

### Proof of Reserves (Optional but Recommended)
- **Asset Allocation**: Breakdown of off-chain assets (US Treasuries) backing the on-chain tokens.
- **Attestation Reports**: Links to the latest monthly audit reports from third-party accounting firms.

---

## 3. FAQ Page Content

**Q: What are T-BillFlow Shares?**
A: When you deposit tBUSD into the vault, you receive T-BillFlow Shares. These shares represent your ownership in the underlying US Treasury Bills.

**Q: How does the yield accrue?**
A: The yield is not paid out in new tokens. Instead, the value of your T-BillFlow Shares increases over time relative to tBUSD. When you withdraw, your shares will be worth more tBUSD than when you deposited.

**Q: Can I trade my shares on PancakeSwap?**
A: Yes! T-BillFlow Shares are standard BEP-20 tokens. You can provide liquidity or swap them instantly on PancakeSwap without waiting for the protocol's withdrawal period.

**Q: Is my money safe?**
A: T-BillFlow smart contracts are verified on BscScan and undergo strict audits. The underlying assets are held in bankruptcy-remote legal structures invested strictly in short-term US Treasury Bills.

**Q: Why BNB Chain?**
A: BNB Chain provides the perfect balance of security, liquidity, and incredibly low transaction fees, making institutional-grade yield accessible to retail users without high gas barriers.

---

## 4. Component Breakdown

To maintain consistency and development speed, the following reusable UI components should be built:

1. **WalletConnectButton**: Handles different states (Connect -> Loading -> Connected/Address Display -> Network Switch prompt if not on BNB Chain).
2. **NumberTicker**: A custom component that formats currency and slowly increments the last decimal places to simulate real-time yield accrual.
3. **ActionCard**: The main container for the Deposit/Withdraw form.
4. **DataMetricCard**: Used for displaying TVL, User Balance, and APY. Can include an information tooltip icon.
5. **TransactionTable**: A standard data table with columns for Action, Amount, Date, and a BscScan external link icon.
6. **TokenIconPair**: A visual asset displaying the tBUSD and T-BillFlow share logos overlapping.

---

## 5. Tech Stack Recommendation

For a fast, reliable, and high-quality build suited for a demo deadline:

- **Framework**: **Next.js (App Router)** - Provides fast page loads, easy routing, and SEO benefits for the public pages.
- **Styling**: **Tailwind CSS + Shadcn UI** - Shadcn provides beautifully designed, accessible, and customizable components (buttons, dropdowns, dialogs) out of the box, drastically reducing CSS time.
- **Web3 Interaction**: **wagmi + viem** - The industry standard for React Web3 hooks. Extremely reliable and developer-friendly.
- **Wallet Connection**: **RainbowKit or ConnectKit** - Pre-built wallet connection modals that look premium and support BNB Chain perfectly.
- **Charting**: **Recharts** - Lightweight and easy to use for the portfolio yield charts.

---

## 6. BscScan Integration Touchpoints

Building trust is paramount. BscScan links should be seamlessly integrated:

- **Footer**: Global link to the verified Vault Smart Contract.
- **Transaction History**: Every row in the portfolio table must have an external link icon redirecting to the BscScan `tx` hash.
- **Deposit/Withdraw Success Modal**: After a successful transaction, display "Transaction Confirmed" with a direct link: "View on BscScan".
- **Token Add Prompt**: A button to "Add T-BillFlow Shares to Wallet" which also includes the token contract BscScan link.

---

## 7. Demo Flow Optimization

For a flawless 30-minute live demo, focus heavily on these interactions:

1. **Frictionless Connection**: Ensure the wallet connect flow defaults easily to BNB Chain and clearly handles the "Switch Network" prompt if the presenter is on Ethereum.
2. **"Live" Yield Illusion**: The `NumberTicker` component is the star of the demo. When the deposit completes, the portfolio balance should immediately start incrementing the 4th decimal place to make the audience *feel* the money growing.
3. **Instant Feedback**: Do not make the audience wait silently during block confirmations. Implement a beautiful "Transaction Pending" state with a loading spinner and a "Waiting for BNB Chain..." message, followed by a celebratory "Deposit Successful" modal.
4. **The BscScan Pivot**: In the success modal, prominently feature the BscScan link. Clicking it proves to the audience that the transaction actually occurred on-chain, cementing the product's reality.
