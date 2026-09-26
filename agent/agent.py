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
try:
    from web3.middleware import geth_poa_middleware
except ImportError:
    # Define a no-op middleware fallback
    def geth_poa_middleware(make_request, w3):
        return make_request

from . import config
from . import contracts
from .logger import get_logger

logger = get_logger(__name__)


def _build_web3() -> Web3:
    """Create a Web3 instance for Arbitrum Sepolia with PoA middleware."""
    w3 = Web3(Web3.HTTPProvider(config.ARBITRUM_SEPOLIA_RPC_URL))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
    return w3


class OffChainAgent:
    def __init__(self) -> None:
        # In mock mode we skip all on‑chain interactions.
        self.w3 = None if config.MOCK_MODE else _build_web3()
        self.gate = None if config.MOCK_MODE else contracts.AgentExecutionGate(config.GATE_ADDRESS, self.w3)
        self.oracle = None if config.MOCK_MODE else contracts.RWAStateOracle(config.ORACLE_ADDRESS, self.w3)
        self.vault = None if config.MOCK_MODE else contracts.TBillVault(config.VAULT_ADDRESS, self.w3)
        self.registry = None if config.MOCK_MODE else contracts.AgentMandateRegistry(config.MANDATE_REGISTRY_ADDRESS, self.w3)

    # ---------------------------------------------------------------------
    # Helper checks
    # ---------------------------------------------------------------------
    def _yield_ok(self) -> bool:
        ok = config.CURRENT_YIELD >= config.YIELD_THRESHOLD
        logger.info(
            f"Synthetic yield {config.CURRENT_YIELD:.2f}% vs threshold {config.YIELD_THRESHOLD:.2f}% – {'OK' if ok else 'below'}"
        )
        return ok

    def _oracle_eligible(self) -> bool:
        if config.MOCK_MODE:
            logger.info("Mock mode – oracle eligibility assumed true")
            return True
        # ``is_eligible`` expects (asset, action). Action ``0`` is a placeholder.
        eligible = self.oracle.is_eligible(config.ASSET_ADDRESS, 0)
        logger.info(f"Oracle eligibility for asset {config.ASSET_ADDRESS}: {eligible}")
        return eligible

    def _mandate_valid(self) -> bool:
        # Query the on-chain AgentMandateRegistry to validate the mandate.
        if config.MOCK_MODE:
            logger.info("Mock mode – mandate validation assumed true")
            return True
        try:
            # Load mandate ID from config; ensure it's provided.
            mandate_id = config.MANDATE_ID
            if not mandate_id:
                logger.warning("Mandate ID not set in config – skipping validation")
                return False
            # Derive the caller (agent) address from the private key.
            acct = self.w3.eth.account.from_key(config.PRIVATE_KEY)
            # Use vault address as target, placeholder action and amount (0).
            target = config.VAULT_ADDRESS
            action = 0
            amount = 0
            # Call the view function; it will revert if invalid.
            self.registry.validate_mandate(mandate_id, acct.address, target, action, amount)
            logger.info("Mandate validation succeeded on-chain")
            return True
        except Exception as e:
            logger.error(f"Mandate validation failed: {e}")
            return False

    def _can_execute(self, request: Dict[str, Any]) -> bool:
        if config.MOCK_MODE:
            logger.info("Mock mode – gate canExecute assumed true")
            return True
        can = self.gate.can_execute(request)
        logger.info(f"AgentExecutionGate.canExecute returned {can}")
        return can

    def _execute(self, request: Dict[str, Any]) -> None:
        if config.MOCK_MODE:
            logger.info("Mock execution – no on‑chain transaction sent")
            return
        tx_hash = self.gate.execute(request, config.PRIVATE_KEY)
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
            "vault": config.VAULT_ADDRESS,
            "asset": config.ASSET_ADDRESS,
            "yield": config.CURRENT_YIELD,
        }

        if not self._can_execute(request):
            logger.info("Gate rejected execution – waiting for next poll")
            return

        # All checks succeeded – execute.
        self._execute(request)


def main() -> None:
    """Entry point – runs the agent continuously respecting ``POLL_INTERVAL``."""
    agent = OffChainAgent()
    logger.info("Off‑chain agent started – mock mode=%s", config.MOCK_MODE)
    try:
        while True:
            agent.run_once()
            time.sleep(config.POLL_INTERVAL)
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")


if __name__ == "__main__":
    main()
