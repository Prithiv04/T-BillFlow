#!/usr/bin/env bash
# =============================================================================
# demo-stale-nav.sh — CASE 4: Valid mandate + stale NAV → NAV_STALE
#
# This is the SIGNATURE demo case for T-BillFlow 2.0.
#
# Pre-conditions:
#   - Valid mandate exists
#   - Oracle NAV was updated but enough time has passed that it is now stale
#     (simulated by waiting > maxNavAge after last updateAssetState())
#
# Expected outcome:
#   canExecute() returns (false, "NavStale") or reverts with NavStale
#   The Gate BLOCKS the transaction even though the mandate is valid
#
# This demonstrates AUTHORIZATION ≠ ELIGIBILITY:
#   Agent is authorized → but RWA state is ineligible → BLOCKED on-chain
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

: "${ARBITRUM_SEPOLIA_RPC_URL:?'Set ARBITRUM_SEPOLIA_RPC_URL in .env'}"
: "${AGENT_EXECUTION_GATE_ADDRESS:?'Set AGENT_EXECUTION_GATE_ADDRESS in .env'}"
: "${RWA_STATE_ORACLE_ADDRESS:?'Set RWA_STATE_ORACLE_ADDRESS in .env'}"
: "${TEST_TOKEN_ADDRESS:?'Set TEST_TOKEN_ADDRESS in .env'}"
: "${TBILL_VAULT_ADDRESS:?'Set TBILL_VAULT_ADDRESS in .env'}"

RPC="$ARBITRUM_SEPOLIA_RPC_URL"
GATE="$AGENT_EXECUTION_GATE_ADDRESS"
ORACLE="$RWA_STATE_ORACLE_ADDRESS"
TOKEN="$TEST_TOKEN_ADDRESS"

echo "======================================================"
echo " CASE 4: Valid Mandate + Stale NAV → NAV_STALE"
echo " (Signature Demo: AUTHORIZATION ≠ ELIGIBILITY)"
echo "======================================================"
echo "Gate:    $GATE"
echo "Oracle:  $ORACLE"
echo ""

# Step 1: Check current oracle NAV freshness
echo "[1] Checking current oracle asset state..."
cast call "$ORACLE" "getAssetState(address)((uint256,uint256,bool,uint8,bool))" "$TOKEN" --rpc-url "$RPC" 2>&1 || echo "    [WARN] Oracle may not have this asset configured."

echo ""
echo "[2] Simulating canExecute() with a stale NAV scenario..."
echo "    To force stale NAV in a live demo, wait for maxNavAge to elapse"
echo "    without calling oracle.updateAssetState(), or set a very short maxNavAge."
echo ""
echo "    In a live test, stale NAV will cause the Gate to reject with:"
echo "    → NavStale (or NavFreshnessViolation)"
echo ""
echo "    This demonstrates that even a VALID mandate cannot override"
echo "    on-chain RWA state requirements. The Gate is the final authority."

MANDATE_ID="${DEMO_MANDATE_ID:-0x$(printf '%064x' 1)}"
cast call "$GATE" \
  "canExecute((bytes32,address,address,address,uint8,uint256,bytes))" \
  "($MANDATE_ID,$TBILL_VAULT_ADDRESS,$TOKEN,$(cast wallet address --private-key $PRIVATE_KEY 2>/dev/null || echo '0x0000000000000000000000000000000000000001'),0,100000000,0x)" \
  --rpc-url "$RPC" 2>&1

echo ""
echo "[✓] CASE 4 demo complete."
echo "    If NavStale returned → BLOCKED. AUTHORIZATION ≠ ELIGIBILITY confirmed."
