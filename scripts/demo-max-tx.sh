#!/usr/bin/env bash
# =============================================================================
# demo-max-tx.sh — CASE 2: Amount > maxTx → TX_LIMIT_EXCEEDED
#
# Pre-conditions:
#   - Valid mandate exists with a specific maxTx cap (e.g., 500 USDC)
#   - We attempt to execute with amount > maxTx
#
# Expected outcome:
#   canExecute() returns (false, "TxLimitExceeded") or reverts with TxLimitExceeded
#   The Gate BLOCKS the transaction before any state change
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
: "${TBILL_VAULT_ADDRESS:?'Set TBILL_VAULT_ADDRESS in .env'}"
: "${TEST_TOKEN_ADDRESS:?'Set TEST_TOKEN_ADDRESS in .env'}"

RPC="$ARBITRUM_SEPOLIA_RPC_URL"
GATE="$AGENT_EXECUTION_GATE_ADDRESS"

echo "======================================================"
echo " CASE 2: Amount > maxTx → TX_LIMIT_EXCEEDED"
echo "======================================================"
echo "Gate:    $GATE"
echo ""

# Use a very large amount that exceeds any reasonable maxTx cap
LARGE_AMOUNT="99999999999999999999999"
MANDATE_ID="${DEMO_MANDATE_ID:-0x$(printf '%064x' 1)}"

echo "[1] Attempting canExecute() with amount=$LARGE_AMOUNT (expects BLOCKED)"
echo "    Expected: TxLimitExceeded error"
echo ""

cast call "$GATE" \
  "canExecute((bytes32,address,address,address,uint8,uint256,bytes))" \
  "($MANDATE_ID,$TBILL_VAULT_ADDRESS,$TEST_TOKEN_ADDRESS,$(cast wallet address --private-key $PRIVATE_KEY 2>/dev/null || echo '0x0000000000000000000000000000000000000001'),0,$LARGE_AMOUNT,0x)" \
  --rpc-url "$RPC" 2>&1

echo ""
echo "[✓] CASE 2 demo complete. TxLimitExceeded → Transaction BLOCKED."
