#!/usr/bin/env bash
# =============================================================================
# demo-valid.sh — CASE 1: Valid mandate + healthy RWA → EXECUTED
#
# Pre-conditions:
#   - Contracts deployed and addresses in .env
#   - Oracle NAV is fresh (updated within maxNavAge)
#   - Redemption is open
#   - A valid mandate has been granted and is not expired/revoked
#
# Expected outcome:
#   canExecute() returns (true, "")
#   execute() submits the transaction successfully
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

: "${ARBITRUM_SEPOLIA_RPC_URL:?'Set ARBITRUM_SEPOLIA_RPC_URL in .env'}"
: "${AGENT_EXECUTION_GATE_ADDRESS:?'Set AGENT_EXECUTION_GATE_ADDRESS in .env'}"
: "${AGENT_MANDATE_REGISTRY_ADDRESS:?'Set AGENT_MANDATE_REGISTRY_ADDRESS in .env'}"
: "${RWA_STATE_ORACLE_ADDRESS:?'Set RWA_STATE_ORACLE_ADDRESS in .env'}"
: "${TBILL_VAULT_ADDRESS:?'Set TBILL_VAULT_ADDRESS in .env'}"
: "${TEST_TOKEN_ADDRESS:?'Set TEST_TOKEN_ADDRESS in .env'}"

RPC="$ARBITRUM_SEPOLIA_RPC_URL"
GATE="$AGENT_EXECUTION_GATE_ADDRESS"

echo "======================================================"
echo " CASE 1: Valid Mandate + Healthy RWA → EXECUTED"
echo "======================================================"
echo "Gate:    $GATE"
echo "RPC:     $RPC"
echo ""

# Query canExecute() — requires a mandate to already be registered.
# This demo calls canExecute() as a read-only simulation.
# Provide a mandateId (bytes32) and an ExecutionRequest struct from env or defaults.

MANDATE_ID="${DEMO_MANDATE_ID:-0x$(printf '%064x' 1)}"
echo "[1] Checking canExecute() for mandate: $MANDATE_ID"
echo "    Expected: (true, '') → EXECUTION ALLOWED"
echo ""

cast call "$GATE" \
  "canExecute((bytes32,address,address,address,uint8,uint256,bytes))" \
  "($MANDATE_ID,$TBILL_VAULT_ADDRESS,$TEST_TOKEN_ADDRESS,$(cast wallet address --private-key $PRIVATE_KEY),0,100000000,$(cast abi-encode 'f(uint256,address)' 100000000 $(cast wallet address --private-key $PRIVATE_KEY) | cut -c3-))" \
  --rpc-url "$RPC" 2>&1 || echo "[INFO] canExecute requires an active mandate. Grant one first via the Registry."

echo ""
echo "[✓] CASE 1 demo complete. If (true,'') returned → EXECUTION ALLOWED."
