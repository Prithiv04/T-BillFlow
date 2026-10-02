# Core off-chain agent implementation for T-BillFlow
"""Rule-based off-chain agent that monitors a yield opportunity and, when
all on-chain checks pass, executes through ``AgentExecutionGate``.

* No secrets are printed or logged.
* In LIVE mode, yield is read from the FRED API (DTB4WK) when FRED_API_KEY is set.
* When FRED is unavailable or not configured, CURRENT_YIELD (from .env) is used as
  a static fallback — this is logged at WARNING level so operators are aware.
* ``MOCK_MODE`` enables dry-run testing without a live node.
* LIVE mode NEVER silently falls back to mock data or simulated values.
"""

import time
from typing import Any, Dict, Optional

from web3 import Web3

from . import config
from . import contracts as contracts_module
from .rwa_provider import fetch_fred_treasury_yield
from .logger import get_logger

logger = get_logger(__name__)


def _build_web3() -> Web3:
    """Create a Web3 instance using the configured network's RPC URL."""
    if not config.RPC_URL:
        raise EnvironmentError(
            f"No RPC URL configured for network '{config.NETWORK}'. "
            "Set ARBITRUM_SEPOLIA_RPC_URL or ARBITRUM_ONE_RPC_URL in your .env file."
        )
    return contracts_module.build_web3(config.RPC_URL)


class OffChainAgent:
    """Off-chain autonomous agent for T-BillFlow.

    In MOCK_MODE: no on-chain interactions. All eligibility checks return True.
    In LIVE mode: all checks are real on-chain reads. No mock fallbacks.
    """

    def __init__(self) -> None:
        # In mock mode we skip all on-chain interactions.
        self.w3: Optional[Web3] = None
        self.gate: Optional[contracts_module.AgentExecutionGate] = None
        self.oracle: Optional[contracts_module.RWAStateOracle] = None
        self.vault: Optional[contracts_module.TBillVault] = None
        self.registry: Optional[contracts_module.AgentMandateRegistry] = None
        self.compliance: Optional[contracts_module.ComplianceRegistry] = None

        if not config.MOCK_MODE:
            self.w3 = _build_web3()
            self.gate = contracts_module.AgentExecutionGate(config.GATE_ADDRESS, self.w3)
            self.oracle = contracts_module.RWAStateOracle(config.ORACLE_ADDRESS, self.w3)
            self.vault = contracts_module.TBillVault(config.VAULT_ADDRESS, self.w3)
            self.registry = contracts_module.AgentMandateRegistry(
                config.MANDATE_REGISTRY_ADDRESS, self.w3
            )
            if config.COMPLIANCE_REGISTRY_ADDRESS:
                self.compliance = contracts_module.ComplianceRegistry(
                    config.COMPLIANCE_REGISTRY_ADDRESS, self.w3
                )

    # ─────────────────────────────────────────────────────────────
    # Helper checks
    # ─────────────────────────────────────────────────────────────

    def _yield_ok(self) -> bool:
        """Evaluate whether current yield meets the configured threshold.

        In LIVE mode: attempts to fetch the real 4-Week T-Bill rate from FRED
        (DTB4WK series) when FRED_API_KEY is configured. Falls back to the
        static CURRENT_YIELD env value with a WARNING if FRED is unavailable.

        In MOCK mode: uses CURRENT_YIELD directly without any external call.
        """
        current_yield = config.CURRENT_YIELD
        yield_source = "config (CURRENT_YIELD)"

        if not config.MOCK_MODE and config.FRED_API_KEY:
            fred_yield = fetch_fred_treasury_yield(
                config.FRED_API_KEY, series_id="DTB4WK"
            )
            if fred_yield is not None:
                current_yield = fred_yield
                yield_source = "FRED API (DTB4WK — live secondary market rate)"
            else:
                logger.warning(
                    "FRED yield unavailable — falling back to static CURRENT_YIELD=%.2f%%. "
                    "This is a configured value, NOT a live market rate. "
                    "Set FRED_API_KEY for live yield evaluation.",
                    config.CURRENT_YIELD,
                )
        elif not config.MOCK_MODE and not config.FRED_API_KEY:
            logger.warning(
                "FRED_API_KEY not configured — using static CURRENT_YIELD=%.2f%% for "
                "yield evaluation. This is NOT a live market rate. "
                "Set FRED_API_KEY in .env to enable real yield assessment.",
                config.CURRENT_YIELD,
            )

        ok = current_yield >= config.YIELD_THRESHOLD
        logger.info(
            "Yield check: %.2f%% [source: %s] vs threshold %.2f%% — %s",
            current_yield,
            yield_source,
            config.YIELD_THRESHOLD,
            "OK" if ok else "below threshold",
        )
        return ok

    def _oracle_eligible(self) -> bool:
        if config.MOCK_MODE:
            logger.info("Mock mode — oracle eligibility assumed true")
            return True
        # Actions.DEPOSIT = 1 (bitmask bit 0) — mirrors Types.sol
        DEPOSIT_ACTION = 1
        try:
            eligible = self.oracle.is_eligible(config.ASSET_ADDRESS, DEPOSIT_ACTION)
            logger.info("Oracle eligibility for asset %s: %s", config.ASSET_ADDRESS, eligible)
            return eligible
        except Exception as e:
            logger.error("Oracle eligibility check failed: %s", e)
            return False

    def _nav_fresh(self) -> bool:
        if config.MOCK_MODE:
            return True
        try:
            fresh = self.oracle.is_nav_fresh(config.ASSET_ADDRESS)
            if not fresh:
                logger.warning("NAV is stale for asset %s — blocking execution", config.ASSET_ADDRESS)
            return fresh
        except Exception as e:
            logger.error("NAV freshness check failed: %s", e)
            return False

    def _gate_not_paused(self) -> bool:
        if config.MOCK_MODE:
            return True
        try:
            paused = self.gate.is_paused()
            if paused:
                logger.critical("SECURITY: AgentExecutionGate is PAUSED — no executions possible")
            return not paused
        except Exception as e:
            logger.error("Gate pause check failed: %s", e)
            return False

    def _mandate_valid(self) -> bool:
        if config.MOCK_MODE:
            logger.info("Mock mode — mandate validation assumed true")
            return True
        mandate_id = config.MANDATE_ID
        if not mandate_id:
            logger.warning("MANDATE_ID not set in config — skipping validation")
            return False
        try:
            acct = self.w3.eth.account.from_key(config.PRIVATE_KEY)
            # validateMandate with action=0 / amount=0 for a presence check
            self.registry.validate_mandate(
                mandate_id, acct.address, config.VAULT_ADDRESS, 0, 0
            )
            logger.info("Mandate validation succeeded on-chain")
            return True
        except Exception as e:
            logger.error("Mandate validation failed: %s", e)
            return False

    def _build_execution_request(self, amount: int) -> Dict[str, Any]:
        """Build the ExecutionRequest struct for AgentExecutionGate.execute()."""
        from eth_abi import encode
        deposit_selector = bytes.fromhex("6e553f65")  # deposit(uint256,address)
        acct = self.w3.eth.account.from_key(config.PRIVATE_KEY)
        receiver = getattr(acct, "address", "0x0000000000000000000000000000000000000001")
        if not isinstance(receiver, str) or not receiver.startswith("0x") or len(receiver) != 42:
            receiver = "0x0000000000000000000000000000000000000001"
        # Encode deposit(amount, receiver=agent_address)
        call_data = deposit_selector + encode(
            ["uint256", "address"], [amount, receiver]
        )
        return {
            "mandateId": config.MANDATE_ID,
            "asset": config.ASSET_ADDRESS,
            "action": 1,  # Actions.DEPOSIT
            "amount": amount,
            "target": config.VAULT_ADDRESS,
            "vault": config.VAULT_ADDRESS,
            "selector": deposit_selector,
            "callData": call_data,
        }

    def _can_execute(self, req: Dict[str, Any]) -> bool:
        if config.MOCK_MODE:
            logger.info("Mock mode — gate canExecute assumed true")
            return True
        try:
            allowed = self.gate.can_execute(req)
            logger.info("AgentExecutionGate.canExecute returned %s", allowed)
            return allowed
        except Exception as e:
            logger.error("canExecute check failed: %s", e)
            return False

    def _execute(self, req: Dict[str, Any]) -> None:
        if config.MOCK_MODE:
            logger.info("Mock execution — no on-chain transaction sent")
            return
        tx_hash = self.gate.execute(req, config.PRIVATE_KEY)
        logger.info("Executed via AgentExecutionGate — tx hash %s", tx_hash)

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def run_once(self, deposit_amount: Optional[int] = None) -> None:
        """Perform a single evaluation cycle and execute if all conditions pass.

        In LIVE mode: every check is an actual on-chain read. No mock fallbacks.
        """
        if not self._yield_ok():
            logger.info("Yield condition not met — waiting for next poll")
            return

        if not self._gate_not_paused():
            logger.info("Gate is paused — waiting for next poll")
            return

        if not self._oracle_eligible():
            logger.info("Oracle indicates ineligible — waiting for next poll")
            return

        if not self._nav_fresh():
            logger.info("NAV is stale — waiting for next poll")
            return

        if not self._mandate_valid():
            logger.info("Mandate not valid — waiting for next poll")
            return

        if config.MOCK_MODE:
            # In mock mode, build a minimal synthetic request for logging purposes
            req: Dict[str, Any] = {
                "vault": config.VAULT_ADDRESS,
                "asset": config.ASSET_ADDRESS,
                "yield": config.CURRENT_YIELD,
            }
            if not self._can_execute(req):
                logger.info("Gate rejected execution — waiting for next poll")
                return
            self._execute(req)
        else:
            # LIVE mode: build a real ExecutionRequest struct
            amount = deposit_amount or 1_000_000  # default: 1 USDC (6 decimals)
            req = self._build_execution_request(amount)
            if not self._can_execute(req):
                logger.info("Gate rejected execution — waiting for next poll")
                return
            self._execute(req)


def main() -> None:
    """Entry point — runs the agent continuously respecting ``POLL_INTERVAL``."""
    agent = OffChainAgent()
    logger.info(
        "Off-chain agent started — network=%s mock_mode=%s",
        config.NETWORK,
        config.MOCK_MODE,
    )
    try:
        while True:
            agent.run_once()
            time.sleep(config.POLL_INTERVAL)
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")


if __name__ == "__main__":
    main()
