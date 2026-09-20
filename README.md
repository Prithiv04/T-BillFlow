# T-BillFlow 2.0

> **AUTHORIZATION ≠ ELIGIBILITY** — An agent may be authorized to act, but the transaction must still be blocked on-chain if the underlying RWA is currently ineligible.

T-BillFlow 2.0 is an Arbitrum-native, RWA-aware agent execution layer. It allows off-chain AI agents to propose vault actions, while an on-chain **AgentExecutionGate** serves as the final enforcement authority — combining mandate-level authorization with real-time RWA state eligibility checks before any transaction executes.

---

## 🧩 The Problem

DeFi protocols that integrate AI agents face a critical gap: off-chain agents may be granted wide authorization, but there is no on-chain mechanism to block execution when the underlying **Real-World Asset (RWA)** is in an ineligible state (e.g., NAV is stale, redemption is suspended, liquidity is insufficient).

Existing solutions conflate **authorization** (who may act) with **eligibility** (whether the asset can currently be acted upon). T-BillFlow 2.0 separates these concerns with a clean, composable architecture.

---

## ⚡ AUTHORIZATION ≠ ELIGIBILITY

```
Agent is authorized to deposit 10,000 USDC → ✓  (mandate check)
T-Bill NAV was last updated 26 hours ago   → ✗  (RWA eligibility check)

Result: BLOCKED on-chain by the AgentExecutionGate
```

The **AgentExecutionGate** is the final authority. It validates both:
1. **Mandate** — Is the agent authorized for this specific action, target, and amount?
2. **RWA State** — Is the underlying asset currently eligible (fresh NAV, open redemption, sufficient liquidity)?

Both must pass. Either can block.

---

## 🏛️ Architecture

Four core contracts — locked, no redesign:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Off-Chain Agent                              │
│   (proposes actions, calls canExecute(), submits tx if allowed)      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ execute(ExecutionRequest)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│              AgentExecutionGate.sol  ← FINAL AUTHORITY               │
│  1. Selector allowlist check (per-target)                            │
│  2. Mandate validation  → AgentMandateRegistry                       │
│  3. RWA eligibility     → RWAStateOracle                             │
│  4. Usage recording     → AgentMandateRegistry.recordUsage()         │
│  5. Execute: target.call(calldata)                                   │
└───────────┬────────────────────────┬─────────────────────────────────┘
            │                        │
            ▼                        ▼
┌─────────────────────┐   ┌──────────────────────┐
│ AgentMandateRegistry│   │   RWAStateOracle     │
│  - EIP-712 grants   │   │  - NAV + freshness   │
│  - nonce replay     │   │  - redemption status │
│  - cumulative caps  │   │  - liquidity tier    │
│  - expiry/revoke    │   │  - action eligibility│
└─────────────────────┘   └──────────────────────┘
            │
            ▼
┌─────────────────────┐
│    TBillVault.sol   │
│  ERC-4626 T-Bill    │
│  vault (simulated)  │
└─────────────────────┘
```

---

## 📄 Four Contracts

### 1. `AgentMandateRegistry.sol`
Stores signed agent mandates using EIP-712. Each mandate specifies:
- **Agent address** — the only entity that may execute
- **Allowed action** — DEPOSIT, REDEEM, ALLOCATE, etc.
- **Target contract** — the specific vault address
- **Asset** — the specific underlying token
- **maxTxAmount** — per-transaction cap
- **maxCumulativeAmount** — lifetime cap
- **validFrom / validUntil** — time-bound

Supports nonce-protected grants, revocation, and extension. Only the owner (principal) may grant/revoke/extend mandates.

### 2. `RWAStateOracle.sol`
Admin-controlled oracle reporting:
- **NAV** (price per share in 18-decimal precision)
- **navUpdatedAt** timestamp and **maxNavAge** staleness window
- **redemptionOpen** flag
- **liquidityTier** (1–5, where 3+ is acceptable for allocations)

Action-specific `isEligible(asset, action)` returns `(bool, bytes)` — pass or fail with a reason.

### 3. `AgentExecutionGate.sol`
The core enforcement contract:
- **Per-target selector allowlist** — mandates can never authorize a selector the Gate hasn't explicitly allowed
- **Deterministic `_validate()`** — mandate + RWA checks in order, custom revert errors
- **`canExecute()`** — read-only simulation of the full validation flow (used by UI and agent)
- **Emergency pause** — owner can halt all execution
- **Reentrancy-protected** execution via `nonReentrant`

### 4. `TBillVault.sol`
ERC-4626 compliant T-Bill vault:
- **Standard `deposit()` / `redeem()` / `withdraw()`** — also callable directly by authorized users
- **Gate-mediated execution** — accepts `execute()` calls from the Gate for agent-driven flows
- **`allocate(uint256)`** — simulated T-Bill allocation (vault operation)
- Integrated with the Gate for NAV freshness and redemption status enforcement

---

## 🔐 Why This Differs from Ordinary Agent Permissions

Ordinary agent permission systems (ACLs, role-based access control) only answer: _"Is the agent allowed?"_

T-BillFlow 2.0 answers **two separate questions**:
1. _"Is the agent authorized for this specific action/amount/target?"_ (AgentMandateRegistry)
2. _"Is the underlying RWA currently eligible for this action?"_ (RWAStateOracle)

**A valid mandate cannot override a stale NAV.** This is the core innovation.

---

## 🎬 Demo Scenarios

| Case | Condition | Expected Result |
|------|-----------|-----------------|
| 1 | Valid mandate + healthy RWA | ✅ EXECUTED |
| 2 | Amount > maxTx cap | ❌ TxLimitExceeded |
| 3 | Cumulative budget exhausted | ❌ CumulativeLimitExceeded |
| 4 | Valid mandate + stale NAV | ❌ NavStale ← **Signature demo** |
| 5 | Valid mandate + redemption closed | ❌ RedemptionClosed |

Run demo scripts (requires `.env` with deployed addresses):
```bash
./scripts/demo-valid.sh
./scripts/demo-max-tx.sh
./scripts/demo-stale-nav.sh
./scripts/demo-redemption-closed.sh
```

---

## 🔒 Security Model

- **Selector allowlist is the outermost gate**: even a fully-valid mandate cannot call a selector not allowlisted by the admin for that target.
- **`_validate()` is atomic**: all checks execute before `target.call()`. No partial state changes.
- **Reentrancy guard**: `AgentExecutionGate.execute()` is `nonReentrant`.
- **Cumulative limits are strictly enforced**: `recordUsage()` reverts if the new total would exceed `maxCumulativeAmount`.
- **Emergency pause**: owner can call `setPaused(true)` to halt all execution globally.
- **Asset substitution prevention**: the Gate validates that `req.asset` matches the asset encoded in `req.calldata`.
- **No arbitrary upgradeability**: contracts are not upgradeable — redeployment required for logic changes.

### Security Test Results (Phase 5)
All 77 tests pass (0 failures):

| Suite | Tests |
|-------|-------|
| AgentMandateRegistryTest | 26 |
| MandateRegistryInvariantTest | 1 (128,000 calls, 0 violations) |
| RWAStateOracleTest | 17 |
| AgentExecutionGateTest | 17 |
| TBillVaultTest | 8 |
| SecurityHardeningTest | 8 |

---

## ⚙️ How to Run Locally

### Prerequisites
- [Foundry](https://getfoundry.sh/) (`forge`, `cast`, `anvil`)
- Node.js v20+ (for frontend)

### Contracts
```bash
cd contracts
forge install          # install dependencies
forge build            # compile
forge test --summary   # run all 77 tests
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

---

## 🚀 Arbitrum Sepolia Deployment

### Prerequisites
1. Copy `.env.example` to `.env` and fill in:
   ```
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   PRIVATE_KEY=<your-deployer-private-key>
   ARBISCAN_API_KEY=<your-arbiscan-key>
   ```
2. Ensure deployer wallet has Arbitrum Sepolia ETH (from [faucet](https://faucet.quicknode.com/arbitrum/sepolia))

### Deployment Sequence

The master script (`Deploy.s.sol`) handles the complete sequence in one broadcast:

1. Deploy **MockUSDC** (test stablecoin)
2. Deploy **AgentMandateRegistry**
3. Deploy **RWAStateOracle**
4. Deploy **AgentExecutionGate** (wired to Registry + Oracle)
5. Deploy **TBillVault** (ERC-4626, underlying = MockUSDC)
6. Wire: `registry.setExecutionGate(gate)` + `vault.setExecutionGate(gate)`
7. Configure oracle: `addAsset(token, 1 days)` + `updateAssetState(token, $1.00 NAV, open, tier 3)`
8. Allowlist vault selectors: `deposit`, `redeem`, `withdraw`, `allocate`

### Deploy Command
```bash
cd contracts

# Dry run (simulation, no broadcast)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url arbitrum_sepolia \
  --private-key $PRIVATE_KEY \
  -vvvv

# Live deployment
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url arbitrum_sepolia \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY \
  -vvvv
```

### Post-Deployment
After deployment, copy the logged contract addresses into `.env`:
```
TEST_TOKEN_ADDRESS=0x...
AGENT_MANDATE_REGISTRY_ADDRESS=0x...
RWA_STATE_ORACLE_ADDRESS=0x...
AGENT_EXECUTION_GATE_ADDRESS=0x...
TBILL_VAULT_ADDRESS=0x...
```

Update these same addresses in the frontend (`frontend/src/lib/constants.ts`).

### Contract Addresses (Arbitrum Sepolia)

> ⚠️ Addresses will be populated after deployment. Update this table post-deploy.

| Contract | Address |
|----------|---------|
| MockUSDC | `TBD` |
| AgentMandateRegistry | `TBD` |
| RWAStateOracle | `TBD` |
| AgentExecutionGate | `TBD` |
| TBillVault | `TBD` |

---

## 🤖 Off-Chain Agent

The agent lives in `agent/agent.py`. V1 is deterministic:

```
IF yield > minimumYield
AND mandate is valid
AND canExecute() returns true
THEN propose and submit execution

ELSE wait and report the reason
```

The agent **must not bypass the Gate** and has **no unlimited authority**.

---

## ⚠️ Limitations

- **V1 is a simulated tokenized-T-Bill vault for testnet demonstration; it does not represent custody of actual U.S. Treasury securities.**
- **RWAStateOracle is a simulated hackathon data provider** — it does not source real NAV data from custodians, pricing services, or fund administrators.
- No real KYC/compliance infrastructure.
- No production Treasury custody.
- No cross-chain execution.
- NAV is admin-updated (not decentralized or automated).
- Testnet only — do not use in production.

---

## 📂 Repository Structure

```
T-billflow/
├── contracts/
│   ├── src/
│   │   ├── Types.sol                   # Shared types, enums, structs
│   │   ├── IAgentMandateRegistry.sol   # Interface
│   │   ├── IRWAStateOracle.sol         # Interface
│   │   ├── IExecutionGate.sol          # Interface
│   │   ├── AgentMandateRegistry.sol    # Phase 1
│   │   ├── RWAStateOracle.sol          # Phase 2
│   │   ├── AgentExecutionGate.sol      # Phase 3
│   │   └── TBillVault.sol              # Phase 4
│   ├── test/                           # 77 Foundry tests (Phases 1–5)
│   ├── script/
│   │   ├── Deploy.s.sol                # Master deployment script
│   │   ├── DeployTestToken.s.sol       # MockUSDC deployment
│   │   └── ConfigureGate.s.sol         # Post-deploy configuration
│   └── foundry.toml
├── scripts/
│   ├── demo-valid.sh                   # Case 1: Valid → EXECUTED
│   ├── demo-max-tx.sh                  # Case 2: Amount > maxTx → BLOCKED
│   ├── demo-stale-nav.sh               # Case 4: Stale NAV → BLOCKED
│   └── demo-redemption-closed.sh       # Case 5: Redemption closed → BLOCKED
├── frontend/                           # Next.js UI
├── agent/                              # Off-chain deterministic agent
├── .env.example                        # Environment template
├── .github/workflows/contracts.yml     # CI: build + test + slither
└── README.md
```

---

## 📜 License

MIT
