# T-BillFlow 2.0 — Problem → Solution Master Implementation Plan

You are working on the existing T-BillFlow 2.0 repository.

Do NOT rebuild the project from scratch.

First understand the existing architecture, contracts, agent, frontend, deployment, and current Arbitrum Sepolia state. Then determine what is genuinely missing to make the project solve the problem below completely and convincingly.

---

# 1. THE REAL PROBLEM

Autonomous AI agents are increasingly capable of making financial decisions and interacting directly with blockchain protocols.

The problem is that giving an AI agent transaction capability creates a dangerous gap between:

* what the agent is authorized to do
* what the asset is currently safe/eligible to allow

A traditional wallet permission is not enough.

For example:

An institution may authorize an agent:

> "You may deposit up to $1M into this Treasury/RWA position."

The mandate can still be perfectly valid while the underlying RWA becomes temporarily ineligible because:

* NAV data is stale
* redemption is closed
* liquidity is insufficient
* the asset is unsupported
* risk conditions are unacceptable
* the mandate has expired
* the transaction exceeds delegated limits

Therefore:

**Authorization does NOT mean Eligibility.**

An autonomous agent needs a deterministic enforcement layer between its decision and the financial protocol.

The AI should be allowed to make decisions.

But the AI must NOT have unrestricted authority to execute those decisions.

---

# 2. THE T-BILLFLOW SOLUTION

T-BillFlow should function as an Arbitrum-native execution control layer for autonomous RWA/Treasury agents.

The fundamental rule is:

**Authorization ≠ Eligibility**

An execution should happen only when BOTH conditions pass:

1. The agent is authorized by a valid cryptographic mandate.
2. The target RWA is currently eligible according to the on-chain RWA state.

Conceptually:

Agent Decision
↓
Mandate Authorization
↓
RWA Eligibility
↓
Execution Gate
↓
T-Bill/RWA Vault

If authorization fails → BLOCK.

If RWA eligibility fails → BLOCK.

If both pass → EXECUTE.

The important security principle is:

**The AI is autonomous. The authority is not.**

The AI may decide what it wants to do, but the blockchain-enforced policy layer decides whether it is actually allowed to execute.

---

# 3. EXISTING T-BILLFLOW ARCHITECTURE

Reuse the existing implementation wherever it already satisfies the problem.

The current architecture contains:

* AgentMandateRegistry
* RWAStateOracle
* AgentExecutionGate
* TBillVault
* off-chain autonomous agent
* Arbitrum Sepolia deployment
* frontend dashboard
* LIVE and DEMO modes
* authorization/eligibility visualization
* execution scenarios
* security tests
* deployment/configuration tooling

Do not replace working components unnecessarily.

---

# 4. WHAT THE FINAL SYSTEM MUST PROVE

The finished project must convincingly demonstrate these three fundamental situations.

## Scenario A — Authorized + Eligible

Agent proposes a valid action.

Mandate is valid.

Action is allowed.

Transaction is within limits.

RWA state is eligible.

Result:

**EXECUTION ALLOWED → transaction can execute**

---

## Scenario B — Authorization Failure

Agent proposes an action that violates its delegated authority.

Examples:

* transaction exceeds maxTx
* cumulative budget exceeded
* action not allowed
* target not allowed
* mandate expired
* mandate revoked

Result:

**EXECUTION BLOCKED**

The agent must not be able to bypass the policy layer.

---

## Scenario C — Authorization Valid + RWA Ineligible

This is the most important scenario.

The agent has a completely valid mandate.

However, the RWA state is currently ineligible.

For example:

* NAV is stale
* redemption is closed
* liquidity requirement is not satisfied

Result:

**EXECUTION BLOCKED**

The UI and architecture must clearly demonstrate:

**VALID MANDATE + INELIGIBLE RWA = BLOCKED**

This is the core differentiator of T-BillFlow.

---

# 5. REAL-WORLD PRODUCT OBJECTIVE

Do not treat T-BillFlow as merely a hackathon dashboard.

Design the architecture so that the current Arbitrum Sepolia/testnet implementation can logically evolve into a real autonomous Treasury/RWA execution infrastructure.

The production direction should support:

* institutional delegated agents
* policy-controlled autonomous execution
* tokenized Treasury/RWA positions
* real RWA data providers/oracles
* deterministic execution constraints
* auditable mandates
* revocation
* spending limits
* asset eligibility checks
* emergency pause
* execution history
* transparent agent decisions

Do not fabricate production integrations.

If a production data source is unavailable, explicitly represent it as unavailable or testnet/simulated rather than creating fake live values.

---

# 6. RWA DATA HONESTY

The current Arbitrum Sepolia RWA oracle may use simulated/configured testnet state.

That is acceptable for the hackathon.

However, the application must clearly distinguish:

### Real on-chain state

Examples:

* deployed contract addresses
* mandate state
* mandate usage
* vault balances
* gate evaluations
* transaction execution
* wallet
* chain
* contract reads

### Simulated/configured testnet RWA state

Examples:

* simulated NAV
* simulated redemption status
* simulated liquidity tier

### Real external data

For example, Treasury yield if obtained from an authoritative external source.

Never present simulated RWA state as real-world Treasury data.

The product should communicate this clearly without making the entire application look fake.

---

# 7. SECURITY REQUIREMENTS

Audit the existing implementation against the problem.

Preserve and strengthen:

* mandate authorization
* EIP-712 signing
* replay protection
* nonce handling
* mandate expiry
* mandate revocation
* max transaction limits
* cumulative limits
* target restrictions
* selector restrictions
* asset matching
* RWA eligibility checks
* NAV freshness
* redemption status
* liquidity requirements
* emergency pause
* reentrancy protection
* calldata integrity
* Gate-only execution where required

The AI must never be able to bypass the Execution Gate and directly perform an operation that should be policy-controlled.

Do not weaken existing security boundaries just to make the demo easier.

---

# 8. AUTONOMOUS AGENT REQUIREMENT

The off-chain agent should remain responsible for decision-making.

The agent may evaluate:

* configured yield opportunity
* mandate validity
* RWA eligibility
* execution feasibility
* Gate result

But it must execute through:

**AgentExecutionGate**

and never directly bypass the Gate for controlled operations.

Do not pretend that an LLM is required if deterministic rules are safer and clearer.

The important distinction is:

**Agent = decision-maker**

**Smart contracts = enforcement layer**

---

# 9. FRONTEND REQUIREMENT

The frontend must communicate the system clearly to a technical judge or institutional user.

The most important visual concept should be:

**Authorization → Eligibility → Execution**

The dashboard should make it immediately obvious:

### Authorization

* designated agent
* mandate status
* allowed actions
* target
* max transaction
* cumulative limit
* expiry
* usage

### Eligibility

* asset supported
* NAV
* NAV freshness
* redemption state
* liquidity
* other supported RWA conditions

### Decision

* EXECUTION ALLOWED
  or
* EXECUTION BLOCKED

The phrase:

**Authorization ≠ Eligibility**

should remain a core product concept.

---

# 10. LIVE VS DEMO

Maintain strict separation.

### LIVE MODE

Must use actual deployed Arbitrum Sepolia state wherever available.

Never silently fall back to mock values.

If live data cannot be retrieved:

**Unavailable**

is preferable to fabricated data.

### DEMO MODE

May use deterministic mock scenarios for judging and demonstrations.

Clearly label simulation/demo state.

Do not mix mock data into LIVE mode.

---

# 11. PRODUCT-MARKET-FIT QUESTION

While implementing, continuously ask:

> "Why would someone actually need this?"

The answer should be clear:

Institutions and autonomous financial systems need a programmable policy layer that allows agents to operate autonomously while keeping financial authority bounded and enforceable.

The product should therefore feel like:

**Agent execution infrastructure**

rather than:

**another AI chatbot + DeFi dashboard.**

Avoid unnecessary AI decoration.

Prioritize:

* transparency
* policy
* risk controls
* auditability
* deterministic enforcement
* financial operations

---

# 12. BUILDATHON REQUIREMENTS

The project is being prepared for:

**Arbitrum Open House Singapore: Online Buildathon**

The project must remain deployed on an Arbitrum chain.

Current target:

**Arbitrum Sepolia**

The judging criteria include:

* smart contract quality
* product-market fit
* innovation and creativity
* real problem solving

Therefore optimize the final implementation around those four criteria.

Do not add random features merely to increase feature count.

Every feature should strengthen one of the four judging dimensions.

---

# 13. YOUR TASK

Now independently audit the existing repository against the complete problem and solution described above.

Determine:

1. What already works correctly.
2. What is incomplete.
3. What is misleading or potentially misleading.
4. What could prevent a judge from understanding the product.
5. What could prevent the product from genuinely solving the stated problem.
6. What security weaknesses remain.
7. What LIVE data is real, simulated, or unavailable.
8. What frontend/product changes are necessary.
9. What documentation/demo changes are necessary.
10. What should NOT be changed because it is already correct.

Then implement everything that is genuinely necessary.

Do not blindly follow the existing implementation if it contradicts the actual problem.

At the same time, do not rewrite working architecture unnecessarily.

---

# 14. NON-NEGOTIABLE RULES

* Do not fabricate data.
* Do not claim simulated RWA data is real.
* Do not expose secrets.
* Do not commit private keys/API keys.
* Do not bypass the Execution Gate.
* Do not weaken security for the demo.
* Do not create fake blockchain transactions.
* Do not call a simulated operation "live".
* Do not replace working contracts without a real reason.
* Do not add unnecessary features.
* Do not change the architecture without justification.
* Do not claim completion until verification proves it.

---

# 15. VERIFICATION

After implementation, run:

* Solidity tests
* invariant/fuzz tests
* Python agent tests
* TypeScript typecheck
* ESLint
* production frontend build
* browser verification
* LIVE mode verification
* DEMO mode verification
* Arbitrum Sepolia contract reads
* Gate authorization/eligibility scenarios

Verify at minimum:

### Authorized + eligible

→ execution allowed

### Over-limit

→ execution blocked

### Valid mandate + stale NAV

→ execution blocked

### Valid mandate + redemption closed

→ execution blocked

### Revoked/expired mandate

→ execution blocked

Confirm that LIVE mode never falls back to mock data.

---

# 16. FINAL OUTPUT

When finished, provide a concise report containing:

### Problem solved

What real problem T-BillFlow now solves.

### Solution

How the final architecture solves it.

### What changed

Exact files/components/contracts modified.

### What was already correct

What was intentionally left untouched.

### Security

Important security guarantees.

### LIVE data

Clearly separate real on-chain data, simulated testnet RWA state, and external data.

### Verification

Exact results of tests, build, and browser verification.

### Remaining limitations

Be completely honest.

### Final readiness

State whether the project is:

* Not ready
* Prototype ready
* Hackathon ready
* Production architecture ready

Do not inflate the result.

Start by auditing the current repository before making any changes.
