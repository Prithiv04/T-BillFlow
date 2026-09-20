# T-BillFlow 2.0 — MASTER IMPLEMENTATION PLAN

You are implementing T-BillFlow 2.0, an Arbitrum-native RWA-aware agent execution layer.

IMPORTANT:
The architecture and scope below are LOCKED.
Do not redesign the architecture.
Do not add extra contracts/features unless explicitly requested.
Do not replace the architecture with a simpler abstraction.

==================================================
1. CORE PRODUCT
==================================================

Core principle:

AUTHORIZATION ≠ ELIGIBILITY

An off-chain agent may be authorized to perform an action, but the transaction must still be blocked if the underlying tokenized RWA is currently ineligible.

The execution decision must be enforced ON-CHAIN.

The AI/off-chain agent proposes actions.
The AgentExecutionGate is the final authority.

V1 uses a simulated tokenized-T-Bill environment on Arbitrum Sepolia.
It does NOT represent custody of real U.S. Treasury securities.

==================================================
2. LOCKED ARCHITECTURE
==================================================

Exactly FOUR main Solidity contracts:

1. AgentMandateRegistry.sol
2. RWAStateOracle.sol
3. AgentExecutionGate.sol
4. TBillVault.sol

Existing shared files:

5. Types.sol
6. Existing interfaces:
   - IAgentMandateRegistry.sol
   - IRWAStateOracle.sol
   - IExecutionGate.sol

Do NOT create:
- Agent.sol
- PolicyEngine.sol
- separate risk engine
- separate oracle aggregator
- DAO contracts
- tokenomics contracts

The off-chain agent lives in:
agent/agent.py

==================================================
3. REPOSITORY STRUCTURE
==================================================

Use exactly this structure:

T-billflow/
├── contracts/
│   ├── src/
│   │   ├── Types.sol
│   │   ├── AgentMandateRegistry.sol
│   │   ├── RWAStateOracle.sol
│   │   ├── AgentExecutionGate.sol
│   │   └── TBillVault.sol
│   ├── test/
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   ├── DeployTestToken.s.sol
│   │   └── ConfigureGate.s.sol
│   └── foundry.toml
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── abis/
│   ├── public/
│   └── package.json
│
├── agent/
│   └── agent.py
│
├── scripts/
│   ├── demo-valid.sh
│   ├── demo-max-tx.sh
│   ├── demo-stale-nav.sh
│   └── demo-redemption-closed.sh
│
├── docs/
├── .github/
│   └── workflows/
│       └── contracts.yml
├── .env.example
├── README.md
└── .gitignore

Fix the current nested T-billflow/T-billflow structure.

Do not delete existing useful frontend code.
Preserve the existing T-BillFlow frontend and migrate it into frontend/.
Update imports/paths only where necessary.

==================================================
4. TECHNOLOGY
==================================================

Contracts:
- Foundry
- Solidity
- OpenZeppelin
- forge-std

Use OpenZeppelin for:
- ERC-4626
- EIP-712
- ECDSA/signature utilities
- Pausable
- SafeERC20 where appropriate

Network:
- Arbitrum Sepolia

Frontend:
- Next.js
- React
- TypeScript
- Wagmi
- Viem
- Tailwind

Agent:
- Python
- web3.py or equivalent minimal dependency
- deterministic rules-based logic

No LLM is required for V1.

Security:
- Slither

==================================================
5. EXISTING INTERFACES ARE AUTHORITATIVE
==================================================

Before implementing contracts:

READ THESE FILES FIRST:

- Types.sol
- IAgentMandateRegistry.sol
- IRWAStateOracle.sol
- IExecutionGate.sol

Do NOT invent new function signatures where an existing interface already defines them.

Implement the interfaces exactly.

Preserve the existing design decisions:

- allowedActionsMask is a bitmask
- ActionMask library handles action encoding/decoding
- custom errors represent rejection reasons
- selector allowlisting belongs to AgentExecutionGate
- canExecute() mirrors execute()
- riskTier exists but is inert in V1

If an interface and this plan appear inconsistent, STOP and report the conflict instead of silently redesigning it.

==================================================
6. TYPES / ACTION MODEL
==================================================

Use the existing Types.sol definitions.

Actions must be represented using the existing bitmask approach.

Do not replace the bitmask with:
- dynamic arrays
- strings
- enums stored as arrays
- arbitrary permissions

The gate must reason about:

(agent, target, selector, asset, action, amount)

==================================================
7. AGENT MANDATE REGISTRY
==================================================

Implement:

AgentMandateRegistry.sol

Responsibilities:

- create/grant mandates
- verify EIP-712 authorization
- generate unique mandate IDs
- store mandate state
- revoke mandates
- extend mandates where defined by interface
- track cumulative usage
- enforce nonce/replay protection
- expose mandate validation information to the gate
- emit useful events

Mandate fields:

- agent
- asset
- allowedTarget
- allowedActionsMask
- maxTx
- maxCumulative
- used
- validFrom
- validUntil
- revoked
- nonce

Required checks:

1. mandate exists
2. mandate is currently valid
3. mandate is not revoked
4. caller is authorized agent
5. requested action is allowed
6. target is allowed
7. amount <= maxTx
8. used + amount <= maxCumulative
9. nonce/signature cannot be replayed

Use EIP-712 typed data.

Do not give the agent unrestricted wallet/private-key authority.

The agent only gets the authority encoded in the mandate.

==================================================
8. RWA STATE ORACLE
==================================================

Implement:

RWAStateOracle.sol

This is a HACKATHON/SIMULATED RWA DATA PROVIDER.

It does not claim to be a production oracle.

Asset state:

- nav
- navUpdatedAt
- redemptionOpen
- liquidityTier
- supported
- maxNavAge

riskTier may exist but MUST remain inert in V1.

Provide controlled functions for updating simulated asset state.

Implement:

isEligible(asset, action)

Eligibility must be ACTION-SPECIFIC.

For example:

DEPOSIT:
- asset supported
- NAV fresh

REDEEM:
- asset supported
- NAV fresh
- redemptionOpen

ALLOCATE:
- asset supported
- NAV fresh
- sufficient liquidity

Do not reduce eligibility to a generic boolean.

NAV freshness:

currentTime - navUpdatedAt <= maxNavAge

Use configurable maxNavAge per asset.

==================================================
9. AGENT EXECUTION GATE
==================================================

This is the CORE CONTRACT.

Implement:

AgentExecutionGate.sol

The gate is the final on-chain authority.

Every execution must validate:

(agent, target, selector, asset, action, amount)

before forwarding anything.

Required checks in deterministic order:

1. caller/agent authorization
2. mandate exists
3. mandate timing valid
4. mandate not revoked
5. action allowed
6. target allowed
7. selector allowed by gate
8. transaction amount <= maxTx
9. cumulative amount <= maxCumulative
10. RWA asset eligibility

Do not forward arbitrary calldata.

NON-NEGOTIABLE:

There must be a per-target selector allowlist.

A mandate must NEVER be able to authorize a selector that the Gate itself has not allowlisted.

No generic arbitrary target/call forwarding.

Use explicit target + selector authorization.

The gate must support:

- emergency pause
- unpause
- selector configuration
- mandate validation
- execution
- canExecute()

Use OpenZeppelin Pausable.

Global pause is separate from mandate revocation.

==================================================
10. canExecute()
==================================================

Implement canExecute() as a read-only simulation of execute().

CRITICAL:

The validation order and conditions of canExecute() must match execute().

The frontend will call canExecute() BEFORE asking MetaMask to sign.

The purpose is to show:

✓ Mandate valid
✓ Action allowed
✓ Target allowed
✓ Selector allowed
✓ Transaction limit
✓ Cumulative limit
✓ NAV freshness
✓ Redemption status
✓ Liquidity

OR:

✗ NAV stale
✗ Transaction limit exceeded
etc.

Do not make canExecute() use different logic from execute().

==================================================
11. CUSTOM ERRORS
==================================================

Use typed Solidity custom errors.

Required errors:

MandateNotFound
MandateNotYetValid
MandateExpired
MandateRevoked
ActionNotAllowed
TargetNotAllowed
CallerNotAgent
TxLimitExceeded
CumulativeLimitExceeded
AssetNotSupported
NavStale
RedemptionClosed
LiquidityTooLow

Do not use generic require("string") for these core rejection paths.

Frontend should eventually map these failures to human-readable messages.

==================================================
12. TBILL VAULT
==================================================

Implement:

TBillVault.sol

Use OpenZeppelin ERC-4626.

V1 is a SIMULATED tokenized-T-Bill vault for testnet.

It does not buy or custody real U.S. Treasury securities.

Use a test stablecoin/mock asset where needed.

Basic conceptual flow:

Mock USDC
   ↓
TBillVault
   ↓
tokenized T-Bill exposure/shares

The vault must support the actions required by the existing Gate/interface.

Keep the vault simple.

Do NOT build:
- real Treasury custody
- real broker integration
- real KYC system
- production RWA issuer integration
- complex yield engine

==================================================
13. SECURITY REQUIREMENTS
==================================================

Must include:

- EIP-712
- nonce/replay protection
- mandate expiry
- mandate revocation
- max transaction limit
- cumulative limit
- selector allowlist
- target restriction
- global emergency pause
- no arbitrary calldata forwarding
- typed custom errors
- access control for administrative functions

Administrative functions must not be callable by arbitrary users.

Use checks-effects-interactions where applicable.

Follow Solidity/OpenZeppelin security best practices.

==================================================
14. TESTING
==================================================

Write tests BEFORE considering each contract complete.

MANDATE TESTS:

- valid mandate
- invalid signature
- expired mandate
- not-yet-valid mandate
- revoked mandate
- wrong agent
- wrong target
- action not allowed
- maxTx exceeded
- cumulative exceeded
- nonce replay
- extend mandate

ORACLE TESTS:

- supported asset
- unsupported asset
- fresh NAV
- stale NAV
- redemption open
- redemption closed
- sufficient liquidity
- insufficient liquidity

GATE TESTS:

- valid execution
- unauthorized selector
- unauthorized target
- paused gate
- stale NAV blocks execution
- redemption closed blocks redemption
- cumulative cap cannot be exceeded

FUZZ / INVARIANT TESTS:

- revoked mandate can never execute
- expired mandate can never execute
- used <= maxCumulative
- unauthorized selector can never execute
- stale NAV cannot allow protected action

Use:

- vm.warp
- vm.prank
- vm.expectRevert
- fuzzing
- invariant testing

Do not move to the next major contract if the current contract's tests are failing.

==================================================
15. DEPLOYMENT
==================================================

Create:

Deploy.s.sol
DeployTestToken.s.sol
ConfigureGate.s.sol

Deployment order should be deterministic.

Document contract addresses after deployment.

First deployment target:

Arbitrum Sepolia.

Do a first deployment around Day 6.

Do not wait until the end.

After security fixes:

redeploy clean version
verify contracts on Arbiscan
update frontend contract addresses
update README

==================================================
16. FRONTEND
==================================================

Preserve the existing T-BillFlow UI where useful.

Do not redesign everything unnecessarily.

Add the new execution-control experience.

Required UI sections:

1. RWA state
   - NAV
   - NAV timestamp/freshness
   - redemption status
   - liquidity tier

2. Agent mandate
   - agent
   - allowed action
   - maxTx
   - cumulative limit
   - expiry
   - used amount

3. Execution preview

Before wallet signature:

CALL canExecute()

Display a checklist:

Mandate        ✓
Agent          ✓
Action         ✓
Target         ✓
Selector       ✓
Tx limit       ✓
Cumulative     ✓
NAV freshness  ✓/✗
Redemption     ✓/✗
Liquidity      ✓/✗

Then:

IF valid:
    show "EXECUTION ALLOWED"
    enable Execute button

IF invalid:
    show "BLOCKED"
    show exact reason
    do NOT ask the wallet to sign

This "why blocked?" experience is a core feature, not optional UI polish.

==================================================
17. OFF-CHAIN AGENT
==================================================

Create:

agent/agent.py

V1 agent is deterministic.

Example logic:

IF yield > minimumYield
AND mandate is valid
AND RWA is eligible
THEN propose execution

ELSE wait.

The agent:

- reads relevant state
- decides whether to propose an action
- calls canExecute()
- if allowed, submits the transaction
- if blocked, reports the reason

The agent must NOT bypass the Gate.

The agent must NOT have unlimited authority.

Do not add an LLM for V1.

Do not build a continuous production scheduler.

On-demand execution is sufficient for the hackathon demo.

==================================================
18. DEMO SCRIPTS
==================================================

Create:

scripts/demo-valid.sh
scripts/demo-max-tx.sh
scripts/demo-stale-nav.sh
scripts/demo-redemption-closed.sh

Required demo cases:

CASE 1:
Valid mandate + healthy RWA
→ EXECUTED

CASE 2:
Amount > maxTx
→ TX_LIMIT_EXCEEDED

CASE 3:
Cumulative budget exceeded
→ CUMULATIVE_LIMIT_EXCEEDED

CASE 4:
Valid mandate + stale NAV
→ NAV_STALE

This is the signature demo.

CASE 5:
Redemption closed
→ REDEMPTION_CLOSED

Only implement Case 5 if the core system is already stable.

==================================================
19. CI / SECURITY
==================================================

Create optional GitHub Actions:

.github/workflows/contracts.yml

Run:

forge build
forge test

and Slither if environment supports it.

Run Slither manually before submission even if CI is unavailable.

Fix meaningful findings.

Do not ignore security findings without understanding them.

==================================================
20. ENVIRONMENT
==================================================

Create:

.env.example

Include:

ARBITRUM_SEPOLIA_RPC_URL=
PRIVATE_KEY=
ARBISCAN_API_KEY=

Never commit .env.

Never hardcode private keys.

Never expose private keys in frontend code.

==================================================
21. README
==================================================

README must clearly explain:

1. Problem
2. AUTHORIZATION ≠ ELIGIBILITY
3. Architecture
4. Four contracts
5. RWA-aware gate
6. Why this differs from ordinary agent permissions
7. Demo scenarios
8. Security model
9. Test results
10. Arbitrum Sepolia deployment
11. Contract addresses
12. How to run locally
13. How to run demo
14. Limitations

Explicitly state:

"For V1, TBillVault is a simulated tokenized-T-Bill vault for testnet demonstration; it does not represent custody of actual U.S. Treasury securities."

Also state that RWAStateOracle is a simulated hackathon data provider.

==================================================
22. EXPLICITLY DO NOT BUILD
==================================================

DO NOT add:

- PolicyEngine contract
- Agent.sol
- LLM decision layer
- ERC-8004
- multi-agent architecture
- multi-RWA architecture
- DAO
- tokenomics
- DEX
- lending/borrowing
- cross-chain execution
- production Treasury custody
- real KYC/compliance infrastructure
- complex oracle network
- unnecessary backend
- continuous autonomous infrastructure

These are outside V1 scope.

==================================================
23. IMPLEMENTATION ORDER
==================================================

Follow this exact order:

PHASE 0
Repository cleanup
- fix nested frontend structure
- verify existing frontend runs
- initialize/verify Foundry project
- verify existing interfaces compile

PHASE 1
AgentMandateRegistry
- implement
- unit tests
- EIP-712
- nonce
- caps
- expiry
- revoke
- extend
- finish before moving on

PHASE 2
RWAStateOracle
- implement
- state updates
- freshness
- action-specific eligibility
- tests

PHASE 3
AgentExecutionGate
- implement
- selector allowlist
- mandate checks
- RWA checks
- pause
- execute
- canExecute
- custom errors
- integration tests

PHASE 4
TBillVault
- ERC-4626
- mock stablecoin
- Gate integration
- tests

PHASE 5
Security testing
- integration
- fuzz
- invariants
- Slither

PHASE 6
Arbitrum Sepolia
- deploy
- configure
- verify
- record addresses

PHASE 7
Agent
- implement deterministic strategy
- canExecute()
- execution
- rejection reporting

PHASE 8
Frontend
- connect contracts
- RWA state panel
- mandate panel
- execution preview
- why-blocked UX
- transaction status

PHASE 9
Demo
- valid
- maxTx
- cumulative
- stale NAV
- redemption closed if stable

PHASE 10
Submission
- README
- architecture diagram
- contract verification
- demo video
- final cleanup
- submission

==================================================
24. WORKING RULES FOR ANTIGRAVITY
==================================================

IMPORTANT:

Do not implement everything in one huge operation.

Work phase-by-phase.

Before each phase:
1. inspect the existing code
2. explain what you intend to modify
3. implement only that phase
4. run tests/build
5. fix errors
6. summarize changed files
7. stop and wait for the next phase

Never silently change the architecture.

Never create additional contracts just because they appear convenient.

Never delete existing working functionality without explaining why.

Prefer small, testable commits/changes.

If an existing interface conflicts with this plan:
STOP.
Show the conflict.
Do not invent a replacement.

The goal is not maximum feature count.

The goal is:
SECURE + TESTED + DEMONSTRABLE + ARBITRUM-DEPLOYED.

START WITH PHASE 0 ONLY.
Do not implement the contracts yet.