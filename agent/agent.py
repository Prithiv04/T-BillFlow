# Core off‑chain agent implementation for T‑BillFlow
"""Rule‑based off‑chain agent that monitors a synthetic yield opportunity and, when
all on‑chain checks pass, executes through ``AgentExecutionGate``.

* No secrets are printed or logged.
* ``CURRENT_YIELD`` is a synthetic, configurable value (environment variable).
* ``MOCK_MODE`` enables dry‑run testing without a live node.
"""

import time
from typing import Any, Dict

from web3 import Web3
from web3.middleware import geth_poa_middleware

from .config import (
    ARBITRUM_SEPOLIA_RPC_URL,
    PRIVATE_KEY,
    GATE_ADDRESS,
    ORACLE_ADDRESS,
    VAULT_ADDRESS,
    ASSET_ADDRESS,
    YIELD_THRESHOLD,
    POLL_INTERVAL,
    CURRENT_YIELD,
    MOCK_MODE,
)
from .logger import get_logger
from .contracts import AgentExecutionGate, RWAStateOracle, TBillVault

logger = get_logger(__name__)


def _build_web3() -> Web3:
    """Create a Web3 instance for Arbitrum Sepolia with PoA middleware."""
    w3 = Web3(Web3.HTTPProvider(ARBITRUM_SEPOLIA_RPC_URL))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
    return w3


class OffChainAgent:
    def __init__(self) -> None:
        # In mock mode we skip all on‑chain interactions.
        self.w3 = None if MOCK_MODE else _build_web3()
        self.gate = None if MOCK_MODE else AgentExecutionGate(GATE_ADDRESS, self.w3)
        self.oracle = None if MOCK_MODE else RWAStateOracle(ORACLE_ADDRESS, self.w3)
        self.vault = None if MOCK_MODE else TBillVault(VAULT_ADDRESS, self.w3)

    # ---------------------------------------------------------------------
    # Helper checks
    # ---------------------------------------------------------------------
    def _yield_ok(self) -> bool:
        ok = CURRENT_YIELD >= YIELD_THRESHOLD
        logger.info(
            f"Synthetic yield {CURRENT_YIELD:.2f}% vs threshold {YIELD_THRESHOLD:.2f}% – {'OK' if ok else 'below'}"
        )
        return ok

    def _oracle_eligible(self) -> bool:
        if MOCK_MODE:
            logger.info("Mock mode – oracle eligibility assumed true")
            return True
        # ``is_eligible`` expects (asset, action). Action ``0`` is a placeholder.
        eligible = self.oracle.is_eligible(ASSET_ADDRESS, 0)
        logger.info(f"Oracle eligibility for asset {ASSET_ADDRESS}: {eligible}")
        return eligible

    def _mandate_valid(self) -> bool:
        # Placeholder – in a real deployment this would query a registry.
        logger.info("Mandate validation placeholder – assuming valid")
        return True

    def _can_execute(self, request: Dict[str, Any]) -> bool:
        if MOCK_MODE:
            logger.info("Mock mode – gate canExecute assumed true")
            return True
        can = self.gate.can_execute(request)
        logger.info(f"AgentExecutionGate.canExecute returned {can}")
        return can

    def _execute(self, request: Dict[str, Any]) -> None:
        if MOCK_MODE:
            logger.info("Mock execution – no on‑chain transaction sent")
            return
        tx_hash = self.gate.execute(request, PRIVATE_KEY)
        logger.info(f"Executed via AgentExecutionGate – tx hash {tx_hash}")

    # ---------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------
    def run_once(self) -> None:
        """Perform a single evaluation cycle and execute if all conditions pass."""
        if not self._yield_ok():
            logger.info("Yield condition not met – waiting for next poll")
            return
        if not self._oracle_eligible():
            logger.info("Oracle indicates ineligible – waiting for next poll")
            return
        if not self._mandate_valid():
            logger.info("Mandate not valid – waiting for next poll")
            return

        request = {
            "vault": VAULT_ADDRESS,
            "asset": ASSET_ADDRESS,
            "yield": CURRENT_YIELD,
        }

        if not self._can_execute(request):
            logger.info("Gate rejected execution – waiting for next poll")
            return

        # All checks succeeded – execute.
        self._execute(request)


def main() -> None:
    """Entry point – runs the agent continuously respecting ``POLL_INTERVAL``."""
    agent = OffChainAgent()
    logger.info("Off‑chain agent started – mock mode=%s", MOCK_MODE)
    try:
        while True:
            agent.run_once()
            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")


if __name__ == "__main__":
    main()
