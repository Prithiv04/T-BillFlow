"""Production Security Monitoring & Anomaly Detection Service.

Listens for on-chain events emitted by AgentExecutionGate, AgentMandateRegistry,
and RWAStateOracle. Monitors for:
  • ExecutionBlocked events (rejections, parameter mismatches)
  • GateWasPaused / GateWasUnpaused emergency actions
  • NAV staleness thresholds approaching expiration
  • Mandate budget utilization approaching saturation (>= 85%)
"""

import time
from typing import Dict, Any, List, Optional
from web3 import Web3

from . import config
from .logger import get_logger

logger = get_logger(__name__)


class ProductionMonitor:
    """Monitors live on-chain security invariants and gate events."""

    def __init__(self, w3: Optional[Web3] = None):
        self.w3 = w3 or (None if config.MOCK_MODE else Web3(Web3.HTTPProvider(config.RPC_URL)))

    def check_nav_freshness(
        self,
        nav_updated_at: int,
        max_nav_age: int,
        current_time: Optional[int] = None
    ) -> Dict[str, Any]:
        """Verify NAV freshness and warn if near expiration window."""
        now = current_time or int(time.time())
        age = now - nav_updated_at
        is_stale = age > max_nav_age
        warning_threshold = int(max_nav_age * 0.8)
        near_expiry = age >= warning_threshold and not is_stale

        status = "HEALTHY"
        if is_stale:
            status = "STALE"
            logger.critical(f"SECURITY ALERT: NAV is STALE! Age: {age}s, Max: {max_nav_age}s")
        elif near_expiry:
            status = "EXPIRING_SOON"
            logger.warning(f"MONITOR WARNING: NAV approaching staleness. Age: {age}s / {max_nav_age}s")

        return {
            "status": status,
            "age_seconds": age,
            "max_age_seconds": max_nav_age,
            "is_stale": is_stale,
            "near_expiry": near_expiry,
        }

    def check_mandate_budget(
        self,
        used: int,
        max_cumulative: int
    ) -> Dict[str, Any]:
        """Check mandate budget exhaustion."""
        if max_cumulative == 0:
            return {"status": "INVALID", "utilization_percent": 0.0}

        utilization = (used / max_cumulative) * 100.0
        saturated = used >= max_cumulative
        near_saturation = utilization >= 85.0

        if saturated:
            logger.warning(f"MANDATE ALERT: Budget 100% saturated ({used} / {max_cumulative})")
        elif near_saturation:
            logger.info(f"MANDATE MONITOR: High budget utilization: {utilization:.1f}%")

        return {
            "used": used,
            "max_cumulative": max_cumulative,
            "utilization_percent": round(utilization, 2),
            "saturated": saturated,
            "near_saturation": near_saturation,
        }

    def handle_event(self, event_name: str, event_data: Dict[str, Any]) -> None:
        """Process an on-chain event and trigger operational alerts."""
        if event_name == "ExecutionBlocked":
            logger.warning(
                f"SECURITY EVENT: Gate Execution Blocked! "
                f"Mandate: {event_data.get('mandateId')}, Agent: {event_data.get('agent')}, "
                f"Reason: {event_data.get('reason')}"
            )
        elif event_name == "GateWasPaused":
            logger.critical(
                f"CRITICAL SECURITY EVENT: Gate was PAUSED by {event_data.get('by')}!"
            )
        elif event_name == "GateWasUnpaused":
            logger.info(
                f"OPERATIONAL EVENT: Gate was unpaused by {event_data.get('by')}."
            )
        elif event_name == "Executed":
            logger.info(
                f"EXECUTION EVENT: Gate executed successfully. Amount: {event_data.get('amount')}"
            )
