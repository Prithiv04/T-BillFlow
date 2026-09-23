T-BillFlow 2.0 — Complete Professional MVP Implementation Plan
1. Product Definition

Build T-BillFlow 2.0, an Arbitrum-native RWA-aware agent execution layer for tokenized US Treasury exposure.

Core principle

Authorization ≠ Eligibility

An agent may have valid delegated authority, but execution must still be rejected when the underlying RWA is not currently eligible.

Product philosophy

The AI is autonomous. The authority is not.

The agent proposes actions.

The smart contract gate decides whether execution is actually permitted.

Final user flow
Human
  │
  │ EIP-712 mandate
  ▼
AgentMandateRegistry
  │
  │ delegated authority
  ▼
Off-chain Agent
  │
  │ execution request
  ▼
AgentExecutionGate
  │
  ├── Authorization checks
  │
  ├── RWA eligibility checks
  │
  └── Risk / budget checks
  │
  ▼
TBillVault
  │
  ▼
Arbitrum Sepolia

The original plan explicitly defines four contracts and keeps the agent logic off-chain rather than creating an Agent.sol.

2. Locked Architecture

Do not introduce unnecessary protocol components.

Smart contracts
contracts/src/

AgentMandateRegistry.sol
RWAStateOracle.sol
AgentExecutionGate.sol
TBillVault.sol
Off-chain
agent/

config.py
contracts.py
agent.py
logger.py
main.py
Frontend
frontend/

Next.js
React
TypeScript
Wagmi
Viem
Tailwind
Infrastructure
Arbitrum Sepolia
Alchemy / Infura
MetaMask
Arbiscan
Foundry
OpenZeppelin
3. AgentMandateRegistry

The registry manages delegated authority.

Mandate

Each mandate contains:

mandateId
owner
agent
asset
allowedTarget
allowedActionsMask
maxTx
maxCumulative
validFrom
validUntil
revoked
usage
nonce
Required functionality
Create mandate

Support EIP-712 authorization.

Validate mandate

Validation must cover:

mandate exists
timing
revoked state
agent identity
action permission
target permission
transaction limit
cumulative limit
Revoke

Only the mandate owner can revoke.

Extend

Only the mandate owner can extend validity.

Usage tracking

The execution gate records usage.

Replay protection

Use EIP-712 + nonce protection.

4. RWAStateOracle

This is deliberately a simulated RWA data provider for the MVP.

Do not waste MVP time integrating an external Treasury/RWA API.

Asset state
struct AssetState {
    uint256 nav;
    uint256 navTimestamp;
    bool redemptionOpen;
    uint8 liquidityTier;
    uint8 riskTier;
}

Track:

asset
supported
NAV
NAV timestamp
maximum NAV age
redemption status
liquidity tier
risk tier
Eligibility rules
Deposit / allocate

Require:

asset supported
NAV fresh
liquidity sufficient
Withdraw / redeem

Require:

asset supported
NAV fresh
redemption open

Risk tier can remain a controlled stretch feature if necessary.

5. AgentExecutionGate

This is the core security boundary of T-BillFlow.

Nothing from the off-chain agent should bypass it.

Required API
canExecute()
checkExecution()
execute()
pause()
unpause()
setSelectorAllowed()
Validation pipeline
1. Gate not paused

2. Calldata integrity
   ├─ calldata >= 4 bytes
   └─ selector matches requested selector

3. Selector is allowlisted

4. Mandate validation

5. Mandate asset == request asset

6. RWA eligibility

7. Execute

The gate should reject with deterministic typed errors.

Examples:

MANDATE_EXPIRED
ACTION_NOT_ALLOWED
TARGET_NOT_ALLOWED
TX_LIMIT_EXCEEDED
CUMULATIVE_LIMIT_EXCEEDED
NAV_STALE
REDEMPTION_CLOSED
LIQUIDITY_TOO_LOW
RISK_TOO_HIGH
Critical invariant

The agent must never call the vault directly for autonomous execution.

Agent
 ↓
Gate
 ↓
Vault

Never:

Agent
 ↓
Vault
6. TBillVault

Implement an ERC-4626-style vault.

Responsibilities:

deposit
withdraw
redeem
mint
allocate

The vault should remain relatively simple.

Important boundary

The vault itself does not become the RWA eligibility engine.

RWA checks remain in:

AgentExecutionGate

Therefore:

Direct ERC-4626 interaction
→ normal vault rules

Agent-mediated interaction
→ Gate authorization + RWA eligibility

Document this explicitly.

7. Security Requirements

The MVP must include:

Asset substitution protection

A mandate for Asset A cannot execute against Asset B.

mandate.asset == request.asset
Selector protection

Only approved functions can be executed.

Target protection

Mandate target must match request target.

Transaction cap
amount <= maxTx
Cumulative cap
used + amount <= maxCumulative
Time validity
validFrom <= now <= validUntil
Revocation

Revoked mandates cannot execute.

Replay protection

EIP-712 nonce.

Reentrancy

Protect the execution path.

Pause

Global emergency pause.

Calldata integrity

Requested selector must match actual calldata selector.

8. Testing

Maintain the existing strong test structure.

Contract tests

Cover:

mandate creation
EIP-712 signing
nonce replay
expiry
revocation
extension
action permission
target permission
tx limit
cumulative limit

NAV freshness
redemption status
liquidity
asset support

selector allowlist
asset mismatch
paused gate
calldata mismatch
reentrancy
usage accounting
Invariant testing

Verify:

used <= maxCumulative

and other important state invariants.

Integration test

The most important final test:

Agent
 → Gate
 → Vault
 → successful state change

Then:

Stale NAV
 → Gate rejection
 → no vault state change
 → no successful execution
9. Off-Chain Agent

The agent should be intentionally simple and explainable.

Do not force an LLM into the execution loop just to call it AI.

Decision logic
if current_yield < minimum_yield:
    wait()

if not rwa_eligible:
    wait()

if not mandate_valid:
    wait()

if not can_execute:
    wait()

execute()
Agent responsibilities
1. Monitor opportunity
2. Evaluate yield threshold
3. Read RWA state
4. Read mandate
5. Call canExecute()
6. Submit Gate.execute()
7. Log result
Yield

Use a configurable/synthetic opportunity yield for MVP.

Clearly label it:

Configured opportunity yield

Do not pretend it is a live Treasury yield feed.

10. Agent Logging

Every evaluation should produce something like:

19:42:13
Opportunity detected
Yield: 6.5%
Threshold: 5.0%

19:42:14
RWA eligibility: PASS

19:42:14
Mandate validation: PASS

19:42:14
Execution gate: ALLOWED

19:42:15
Transaction submitted
0x...

For rejection:

19:45:01
Opportunity detected
Yield: 6.5%

RWA eligibility: FAIL

Reason:
NAV_STALE

Decision:
WAIT

Transaction submitted:
NO

This is much better than pretending the agent is a mysterious autonomous black box.

11. Frontend — Professional Product Standard

This is the major update.

The frontend must not look AI-generated or like a generic Web3 hackathon dashboard.

The goal is:

Institutional RWA / Treasury operations interface.

The original project architecture already specifies Next.js 16 + React 19 + Wagmi/RainbowKit for the frontend; this plan now makes the visual/product quality an explicit MVP acceptance requirement.

12. Frontend Design Direction
Visual characteristics

Use:

clean
minimal
financial
technical
precise
dense but readable
professional
restrained
Avoid
❌ excessive gradients
❌ neon Web3 aesthetic
❌ excessive glassmorphism
❌ glowing cards
❌ giant rounded rectangles
❌ emoji-heavy UI
❌ fake AI animations
❌ random metrics
❌ excessive shadows
❌ unnecessary decorative illustrations

The UI should feel like a real treasury / financial infrastructure application.

13. Design System
Colors

Primary:

White
Off-white
Charcoal
Dark gray
Neutral gray

Semantic:

Green → success / eligible
Red → blocked / failed
Amber → warning
Blue → informational

Use accent color sparingly.

Typography

Use a polished modern sans-serif:

Inter / Geist / IBM Plex Sans

Use monospace only for:

wallet addresses
transaction hashes
selectors
contract addresses
14. Application Shell

Use a professional sidebar.

T-BillFlow
RWA EXECUTION INFRASTRUCTURE

Overview

Portfolio

Mandates

RWA Assets

Agent
  Activity
  Policies

Executions

────────────────

Arbitrum Sepolia

Settings

Top bar:

Arbitrum Sepolia

● Connected

0x83...91A2

Keep navigation intentionally small.

15. Overview Dashboard

The dashboard should answer:

What is my portfolio doing, what is the agent doing, and can it execute?

Summary
Portfolio Value
$1.28M

Active Mandates
3

Agent Status
RUNNING

Then the central execution interface.

16. Main Execution Panel

This should be the signature UI component.

EXECUTION REQUEST

Deposit
$250,000
into USTB

────────────────────────

AUTHORIZATION

✓ Mandate active
✓ Agent authorized
✓ Transaction limit
✓ Cumulative limit

ELIGIBILITY

✓ NAV fresh
✓ Redemption open
✓ Liquidity sufficient

────────────────────────

EXECUTION ALLOWED

[ Execute ]

This visually communicates:

Authorization
      +
Eligibility
      ↓
Execution
17. Authorization vs Eligibility

Create a dedicated visual component.

AUTHORIZATION              ELIGIBILITY

Mandate                    RWA State

✓ Agent                    ✓ NAV fresh
✓ Action                   ✓ Redemption
✓ Target                   ✓ Liquidity
✓ Tx limit

VALID                      ELIGIBLE

             ↓

       EXECUTION GATE

          ALLOWED

This becomes the visual representation of:

Authorization ≠ Eligibility

18. Portfolio

Show actual vault information:

Portfolio

Total Value
$1,284,320

Vault Shares
1,283,100

Current APY
5.82%

Available
$320,000

Then:

USTB

NAV
$1.0002

Position
$1.28M

Shares
1,281,000

[Deposit] [Withdraw] [Redeem]

No unnecessary graphs unless the data actually supports them.

19. Mandates

Professional policy-management interface.

Mandates

Agent        Asset     Actions          Limit       Status

0x83...91A2  USTB      Deposit/Redeem   $5M         Active
0x17...C821  USTB      Withdraw         $500K       Expired

Mandate detail:

Mandate #0042

Agent
0x83...91A2

Asset
USTB

Target
TBillVault

Allowed Actions
Deposit
Withdraw
Redeem

Transaction Limit
$1,000,000

Cumulative Limit
$5,000,000

Usage
$250,000 / $5,000,000

Validity
Sep 23 → Oct 23

Status
ACTIVE

Create mandate:

Authority
Permissions
Limits
Validity
Review
Sign with wallet
20. RWA Assets
RWA Assets

Asset     NAV       Age       Redemption   Liquidity   Status

USTB      $1.0002   24 sec    Open          Tier 3      Eligible

Asset details:

USTB

Tokenized Treasury Exposure

NAV
$1.0002

NAV Freshness
24 seconds

Redemption
OPEN

Liquidity
Tier 3

Last Update
19:42:13 UTC

Execution Eligibility
ELIGIBLE
21. Agent Interface

Make the agent transparent.

Agent

Execution Agent #01

● RUNNING

Strategy
Threshold-based execution

Yield Threshold
5.0%

Current Opportunity
6.5%

Last Evaluation
12 seconds ago

Next Evaluation
48 seconds

Activity timeline:

Opportunity detected
        ↓
RWA eligibility checked
        ↓
Mandate validated
        ↓
Gate evaluated
        ↓
Transaction submitted
22. Execution History

Use a clean operations table.

Time      Action     Asset   Amount      Result

19:42     Deposit    USTB    $250,000    Success
19:31     Redeem     USTB    $100,000    Blocked

Execution details:

Execution #0192

Result
BLOCKED

Reason
NAV_STALE

Authorization
✓ Valid

Transaction Limit
✓ Valid

Cumulative Limit
✓ Valid

RWA Eligibility
✕

NAV Freshness
✕

Technical details can be expandable.

23. Technical Details Drawer

For developers/judges:

Mandate ID
Target
Selector
Asset
Action
Amount
Gate
Registry
Oracle
Transaction hash
Block number

Keep this hidden behind:

View technical details

This keeps the interface clean while preserving technical depth.

24. Demo Mode

The existing five deterministic scenarios should remain.

1. Valid Execution
2. Exceeds Max Transaction
3. Exceeds Cumulative Budget
4. Stale NAV
5. Redemption Closed

The existing implementation already defines these scenarios as mock/demo evaluations; the final MVP should clearly distinguish those from real testnet execution.

Show:

DEMO MODE

Simulated execution environment.
No blockchain transaction will be submitted.

Never present simulated transactions as real transactions.

25. Live Mode vs Demo Mode

This separation is critical.

Demo
MOCK_MODE=true

Uses:

mock wallet
mock transactions
mock RWA states
mock scenarios
Live
MOCK_MODE=false

Uses:

Arbitrum Sepolia
real wallet
real contracts
real oracle
real gate
real vault
real transactions

The UI should visibly indicate the current mode.

26. Wallet UX

Connected:

● Arbitrum Sepolia

0x83...91A2

Disconnected:

Connect Wallet

Wallet dropdown:

Address
Network
Balance

Disconnect

No oversized Web3 wallet UI.

27. Loading / Error / Empty States

Every page must have proper states.

Loading

Skeletons.

Empty
No mandates yet.

Create a mandate to give an execution
agent scoped authority.

[Create mandate]
Error
Execution blocked

NAV data is stale.

Current age
7h 42m

Required
< 1h

No transaction was submitted.
28. Responsive UI

Must work at:

1440px
1280px
1024px
768px
390px

Desktop:

Sidebar + content

Mobile:

Top navigation
Content
Mobile navigation

Tables become horizontally scrollable or responsive list layouts.

29. Frontend Architecture
frontend/src/

app/
├── overview/
├── portfolio/
├── mandates/
├── rwa/
├── agent/
├── executions/
└── settings/

components/
├── layout/
├── navigation/
├── execution/
├── mandate/
├── rwa/
├── agent/
├── vault/
└── common/

hooks/
├── useMandate.ts
├── useRwaState.ts
├── useExecutionGate.ts
├── useVault.ts
└── useAgent.ts

lib/
├── contracts.ts
├── formatters.ts
├── errors.ts
└── utils.ts

abis/
types/
config/
30. Frontend Data Integrity

Every displayed value must have a known source.

Live
Wallet → wallet
NAV → Oracle
NAV timestamp → Oracle
Redemption → Oracle
Liquidity → Oracle
Mandate → Registry
Usage → Registry
Vault position → Vault
Execution → Gate / transaction
Demo
Demo yield
Demo transactions
Demo wallet
Demo RWA state

Never silently mix them.

31. Frontend Quality Gate

Before calling the frontend complete:

[ ] Professional visual hierarchy
[ ] No generic AI dashboard appearance
[ ] No excessive gradients
[ ] No excessive cards
[ ] No unnecessary animations
[ ] No emojis
[ ] Consistent typography
[ ] Consistent spacing
[ ] Proper loading states
[ ] Proper error states
[ ] Proper empty states
[ ] Responsive
[ ] Accessible
[ ] Keyboard navigation
[ ] Wallet UX
[ ] Live/demo separation
[ ] Real contract data in live mode
[ ] Technical details available
[ ] Transaction links work
[ ] No fake live data
[ ] No placeholder content
32. Deployment

Use a new deployment wallet for the final testnet deployment because the previous deployment credentials were exposed.

Never place secrets into:

GitHub
.env committed files
frontend
README
screenshots

Use:

.env
.env.local
GitHub Actions secrets
33. Arbitrum Sepolia Deployment

Deploy:

MockUSDC
AgentMandateRegistry
RWAStateOracle
AgentExecutionGate
TBillVault

Then configure:

Registry → Gate
Vault → Gate
Oracle → Asset
Oracle → initial state
Gate → allowed selectors

Verify:

ownership
addresses
wiring
selectors
oracle state
34. Real On-Chain Proof

This is the most important remaining integration proof.

Demonstrate:

Human
 ↓
Mandate
 ↓
Agent
 ↓
canExecute()
 ↓
Gate.execute()
 ↓
TBillVault
 ↓
successful Arbitrum Sepolia transaction

Then deliberately change:

NAV → stale

and demonstrate:

Agent
 ↓
Gate
 ↓
NAV_STALE
 ↓
REVERT
 ↓
Vault unchanged

This is the strongest demonstration of your actual differentiator.

35. Frontend Live Integration

After deployment, replace static addresses with verified testnet addresses.

Frontend must read:

Registry
Oracle
Gate
Vault

using Wagmi/Viem.

Live dashboard should show
actual wallet
actual chain
actual vault balance
actual mandate
actual RWA state
actual canExecute()
actual transaction
actual transaction hash
actual explorer link
36. End-to-End Test

Final E2E:

Test A
Healthy RWA
+
Valid mandate
+
Within budget
+
Yield above threshold

→ EXECUTE
→ Vault state changes
→ transaction confirmed
Test B
Stale NAV
+
Valid mandate
+
Within budget

→ BLOCK
→ no vault state change
Test C
Valid RWA
+
Valid mandate
+
Amount > maxTx

→ BLOCK
Test D
Valid RWA
+
Valid mandate
+
Cumulative limit exceeded

→ BLOCK
Test E
Redemption closed
+
Redeem request

→ BLOCK
37. CI / Verification

Final automated verification:

forge build
forge test
pytest
npm run lint
npm run build

If possible:

Slither

Also perform:

git diff
git status

and ensure no generated files/secrets are included.

38. Documentation

README must contain:

1. What is T-BillFlow?
2. Problem
3. Core principle
4. Architecture
5. Contract responsibilities
6. Agent architecture
7. RWA eligibility
8. Security model
9. Frontend
10. Demo scenarios
11. Local setup
12. Arbitrum Sepolia deployment
13. Contract addresses
14. Test results
15. Live transaction
16. Limitations
17. Future work

Be honest about simulated components.

For example:

RWAStateOracle currently represents a simulated RWA data provider for demonstration and testnet validation.

Do not describe the system as connected to real Treasury market infrastructure unless that has actually been implemented.

39. Demo Script

The final 3–5 minute demo should follow this order:

1. Problem
Agents can be authorized to execute financial actions,
but authorization alone doesn't guarantee that the underlying
asset is currently eligible.
2. Architecture

Show:

Agent
 ↓
Mandate Registry
 ↓
Execution Gate ← RWA Oracle
 ↓
TBillVault
3. Valid execution

Show:

Yield > threshold
RWA eligible
Mandate valid
canExecute = true

Execute.

Show actual transaction.

4. Stale NAV

Change RWA state.

Show:

Authorization ✓
Eligibility ✕
Execution BLOCKED
5. Explain the differentiator

The agent can propose. The gate decides.

40. Explicitly Out of MVP

Do not expand scope unnecessarily.

Leave these for future versions:

❌ Mainnet deployment
❌ Real institutional Treasury API
❌ Production oracle network
❌ Multi-chain deployment
❌ Complex AI strategy generation
❌ LLM-controlled transaction construction
❌ Automated yield optimization across protocols
❌ Advanced portfolio rebalancing
❌ ZK verification
❌ FHE
❌ DAO governance
❌ Cross-chain messaging
❌ Production custody

The MVP should prove the execution architecture, not become an entire RWA platform.

41. Final MVP Acceptance Checklist

The project is MVP-complete only when all of these are true:

Smart contracts
[ ] Registry implemented
[ ] EIP-712 mandates
[ ] Revocation
[ ] Expiry
[ ] Action permissions
[ ] Target permissions
[ ] Tx limits
[ ] Cumulative limits

[ ] RWA Oracle implemented
[ ] NAV freshness
[ ] Redemption state
[ ] Liquidity state

[ ] Execution Gate implemented
[ ] Selector protection
[ ] Target protection
[ ] Asset matching
[ ] Authorization validation
[ ] RWA eligibility
[ ] Pause
[ ] Reentrancy protection

[ ] ERC-4626 vault implemented
Security
[ ] Asset substitution blocked
[ ] Selector mismatch blocked
[ ] Truncated calldata blocked
[ ] Reentrancy blocked
[ ] Cumulative cap enforced
[ ] Revoked mandate blocked
[ ] Future mandate blocked
[ ] Vault allowance bypass prevented
Agent
[ ] Opportunity evaluation
[ ] Yield threshold
[ ] RWA check
[ ] Mandate check
[ ] canExecute()
[ ] Gate.execute()
[ ] Logging
[ ] MOCK_MODE
[ ] LIVE_MODE
Frontend
[ ] Professional application shell
[ ] Overview
[ ] Portfolio
[ ] Mandates
[ ] RWA Assets
[ ] Agent
[ ] Executions
[ ] Wallet
[ ] Live/demo separation
[ ] Execution preview
[ ] Authorization vs Eligibility
[ ] Technical details
[ ] Loading states
[ ] Error states
[ ] Empty states
[ ] Responsive design
[ ] Accessibility
[ ] No AI-generated-looking visual style
Blockchain
[ ] Arbitrum Sepolia deployment
[ ] Contracts verified
[ ] Registry configured
[ ] Oracle configured
[ ] Gate configured
[ ] Vault configured
[ ] Live Gate → Vault transaction
[ ] Live stale-NAV rejection
Final quality
[ ] forge test passes
[ ] pytest passes
[ ] frontend lint passes
[ ] frontend build passes
[ ] E2E passes
[ ] README complete
[ ] Contract addresses documented
[ ] Transaction hash documented
[ ] No secrets committed
[ ] No .pyc / __pycache__
[ ] Demo reproducible
Final product architecture
                         HUMAN
                           │
                           │ EIP-712
                           ▼
                 ┌─────────────────────┐
                 │ AgentMandateRegistry│
                 └──────────┬──────────┘
                            │
                            │ Authority
                            ▼
                     ┌─────────────┐
                     │ AI AGENT    │
                     │ OFF-CHAIN   │
                     └──────┬──────┘
                            │
                     Execution Request
                            │
                            ▼
              ┌──────────────────────────┐
              │   AgentExecutionGate     │
              │                          │
              │ Authorization            │
              │      +                   │
              │ RWA Eligibility          │
              │      +                   │
              │ Limits / Security        │
              └───────┬───────────▲──────┘
                      │           │
                      │           │
                      ▼           │
               ┌────────────┐    │
               │ TBillVault │    │
               └─────┬──────┘    │
                     │            │
                     ▼            │
              Arbitrum Sepolia    │
                                  │
                       ┌──────────┴─────────┐
                       │   RWAStateOracle  │
                       │                   │
                       │ NAV               │
                       │ Freshness         │
                       │ Redemption        │
                       │ Liquidity         │
                       └───────────────────┘


             ┌─────────────────────────────────┐
             │       PROFESSIONAL FRONTEND     │
             │                                 │
             │ Overview                        │
             │ Portfolio                       │
             │ Mandates                        │
             │ RWA Assets                      │
             │ Agent                           │
             │ Executions                      │
             │                                 │
             │ Authorization ≠ Eligibility     │
             └─────────────────────────────────┘

The final standard should be: technically rigorous contracts + explainable agent + real Arbitrum Sepolia proof + a frontend that looks like a credible RWA/treasury product.

That gives you a much stronger complete MVP than simply adding more features. The original source also explicitly frames the project around the combination of delegated agent authority and live RWA-state checks as a per-transaction execution condition, so the frontend should make that exact idea visually obvious.