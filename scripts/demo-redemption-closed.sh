#!/usr/bin/env bash
# =============================================================================
# demo-redemption-closed.sh — CASE 5: Redemption closed → REDEMPTION_CLOSED
#
# Pre-conditions:
#   - Valid mandate exists with REDEEM action
#   - Oracle has redemption closed for the asset
#     (oracle.updateAssetState(token, nav, false, tier) with redemptionOpen=false)
#
# Expected outcome:
#   canExecute() returns (false, "RedemptionClosed") or reverts with RedemptionClosed
#   The Gate BLOCKS the redemption even though agent mandate is valid
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
: "${PRIVATE_KEY:?'Set PRIVATE_KEY in .env'}"

RPC="$ARBITRUM_SEPOLIA_RPC_URL"
GATE="$AGENT_EXECUTION_GATE_ADDRESS"
ORACLE="$RWA_STATE_ORACLE_ADDRESS"
TOKEN="$TEST_TOKEN_ADDRESS"

echo "======================================================"
echo " CASE 5: Redemption Closed → REDEMPTION_CLOSED"
echo "======================================================"
echo "Gate:    $GATE"
echo "Oracle:  $ORACLE"
echo ""

# Step 1: Close redemption in the oracle
echo "[1] Closing redemption in RWAStateOracle..."
echo "    Calling: oracle.updateAssetState(token, 1e18, false, 3)"
echo "    (redemptionOpen = false)"
cast send "$ORACLE" \
  "updateAssetState(address,uint256,bool,uint8)" \
  "$TOKEN" "1000000000000000000" "false" "3" \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC" 2>&1

echo ""
echo "[2] Verifying oracle state (redemptionOpen should be false)..."
cast call "$ORACLE" "getAssetState(address)((uint256,uint256,bool,uint8,bool))" "$TOKEN" --rpc-url "$RPC" 2>&1

echo ""
echo "[3] Calling canExecute() with REDEEM action (action=1)..."
echo "    Expected: RedemptionClosed → BLOCKED"
MANDATE_ID="${DEMO_MANDATE_ID:-0x$(printf '%064x' 1)}"
cast call "$GATE" \
  "canExecute((bytes32,address,address,address,uint8,uint256,bytes))" \
  "($MANDATE_ID,$TBILL_VAULT_ADDRESS,$TOKEN,$(cast wallet address --private-key $PRIVATE_KEY),1,100000000,0x)" \
  --rpc-url "$RPC" 2>&1

echo ""
echo "[4] Re-opening redemption (restoring state)..."
cast send "$ORACLE" \
  "updateAssetState(address,uint256,bool,uint8)" \
  "$TOKEN" "1000000000000000000" "true" "3" \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC" 2>&1

echo ""
echo "[✓] CASE 5 demo complete. RedemptionClosed → Transaction BLOCKED."
echo "    State restored: redemption re-opened."
