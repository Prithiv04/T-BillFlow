"""Institutional Settlement & Custody Integration Module for T-BillFlow.

Bridges on-chain agent executions (e.g. USDC deposits into TBillVault) with real
off-chain Treasury settlement through institutional custodians (e.g. BNY Mellon,
Coinbase Prime, Circle Mint, Copper).

EXTERNAL DEPENDENCIES (required before production use):
─────────────────────────────────────────────────────────
1. Legal Entity: Delaware Statutory Trust, Cayman SPV, or regulated fund structure.
   EXTERNAL_DEPENDENCY — legal/corporate setup required.
2. Custody Agreement: Tri-party custody agreement with a qualified custodian.
   EXTERNAL_DEPENDENCY — agreement with BNY Mellon / Coinbase Prime / Copper required.
3. Broker-Dealer Relationship: Institutional account with licensed broker-dealer.
   EXTERNAL_DEPENDENCY — Cantor Fitzgerald, DriveWealth, or equivalent required.
4. Automated Mint/Redeem API: Production API credentials from Circle Mint or tokenized
   T-Bill issuer (Ondo Finance, Superstate, Securitize, etc.).
   EXTERNAL_DEPENDENCY — API credentials and onboarding required.
5. Banking Infrastructure: Fedwire/ACH cutoff schedules (typically 2:00 PM EST).
   EXTERNAL_DEPENDENCY — bank account + wire routing configured with custodian.

Integration boundary: This module exposes the correct abstraction surface. When a real
custodian API is configured via environment variables, plug the real HTTP calls in at
the clearly marked integration points below. Nothing in the existing on-chain protocol
needs to change.
"""

import hashlib
from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from . import config
from .logger import get_logger

logger = get_logger(__name__)


class SettlementState(str, Enum):
    PENDING_DEPOSIT = "PENDING_DEPOSIT"          # USDC deposited on-chain, awaiting custody sweep
    IN_TRANSIT = "IN_TRANSIT"                    # Wire in transit to broker-dealer
    INVESTED_IN_TREASURIES = "INVESTED_IN_TREASURIES"  # Physical T-Bills purchased, shares minted
    PENDING_REDEMPTION = "PENDING_REDEMPTION"    # Redemptions burning shares, wire awaiting clearance
    SETTLED = "SETTLED"                          # Fully cleared and settled
    FAILED = "FAILED"                            # Rejected by custodian / compliance


def _is_demo_or_testnet() -> bool:
    """True when running against mock or testnet — never real settlement."""
    return config.MOCK_MODE or config.NETWORK not in ("arbitrum_one",)


class CustodySettlementManager:
    """Manages institutional settlement reconciliation between on-chain vault and
    off-chain custodian.

    In DEMO/testnet mode: all operations are explicitly labelled as simulated.
    In production (Arbitrum One) mode: requires real custodian API credentials.
    Operations WITHOUT credentials return an `external_dependency_required` result;
    they NEVER fabricate a successful settlement state.
    """

    def __init__(
        self,
        custodian_api_url: Optional[str] = None,
        client_id: Optional[str] = None
    ):
        self.custodian_api_url = custodian_api_url or config.CUSTODIAN_API_URL
        self.client_id = client_id or config.CUSTODIAN_CLIENT_ID
        self._demo = _is_demo_or_testnet()

    # ─────────────────────────────────────────────────────────────
    # Demo / Testnet helpers (strictly isolated)
    # ─────────────────────────────────────────────────────────────

    def _demo_status(self, tx_hash: str) -> Dict[str, Any]:
        """Return an explicitly labelled demo/testnet settlement status.
        Never presented as real settlement.
        """
        return {
            "status": "demo_simulation",
            "tx_hash": tx_hash,
            "settlement_state": SettlementState.PENDING_DEPOSIT.value,
            "message": (
                "DEMO/TESTNET: No real settlement occurs in this mode. "
                "On-chain tokens represent simulated T-Bill positions only. "
                "Production Treasury settlement requires real custodian API credentials."
            ),
            "mode": config.NETWORK,
        }

    def _demo_wire(self, investor_address: str, amount_usdc: float, mandate_id: str) -> Dict[str, Any]:
        """Return an explicitly labelled demo/testnet wire result."""
        logger.info(
            "[DEMO/TESTNET] Simulated custody wire for %s: $%.2f (not real)",
            investor_address, amount_usdc
        )
        return {
            "success": False,
            "status": "demo_simulation",
            "message": (
                "DEMO/TESTNET: No real wire initiated. "
                "Institutional Treasury settlement requires production custodian credentials."
            ),
            "mandate_id": mandate_id[:10] + "...",
            "mode": config.NETWORK,
        }

    # ─────────────────────────────────────────────────────────────
    # Production credential check
    # ─────────────────────────────────────────────────────────────

    def _missing_credentials_status(self, tx_hash: str) -> Dict[str, Any]:
        return {
            "status": "external_dependency_required",
            "tx_hash": tx_hash,
            "settlement_state": SettlementState.PENDING_DEPOSIT.value,
            "message": (
                "Live institutional Treasury settlement requires an active custodian API integration "
                "(e.g. Circle Mint, Coinbase Prime, or BNY Mellon custody). "
                "Configure CUSTODIAN_API_URL and CUSTODIAN_CLIENT_ID."
            ),
            "required_credentials": ["CUSTODIAN_API_URL", "CUSTODIAN_CLIENT_ID"],
        }

    def _missing_credentials_wire(self) -> Dict[str, Any]:
        return {
            "success": False,
            "status": "external_dependency_required",
            "reason": "Missing CUSTODIAN_API_URL or CUSTODIAN_CLIENT_ID in production environment.",
            "action_required": (
                "Establish institutional broker-dealer API credentials and custody agreement. "
                "See EXTERNAL_DEPENDENCY notes in settlement.py."
            ),
        }

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def get_settlement_status(self, tx_hash: str) -> Dict[str, Any]:
        """Query settlement status from the institutional custodian.

        DEMO/TESTNET → explicit simulation label, no fake data.
        PRODUCTION without credentials → explicit external_dependency_required.
        PRODUCTION with credentials → real custodian API call.
        """
        if not self.custodian_api_url or not self.client_id:
            return self._missing_credentials_status(tx_hash)

        if self._demo:
            return self._demo_status(tx_hash)

        # ── REAL CUSTODIAN API INTEGRATION POINT ─────────────────────────────
        # EXTERNAL_DEPENDENCY: Replace the block below with the real HTTP request
        # to your custodian's settlement status endpoint.
        #
        # Example (Circle Mint):
        #   import requests
        #   resp = requests.get(
        #       f"{self.custodian_api_url}/v1/settlements/{tx_hash}",
        #       headers={"Authorization": f"Bearer {self.client_id}"},
        #       timeout=10,
        #   )
        #   resp.raise_for_status()
        #   data = resp.json()
        #   return {
        #       "status": "connected",
        #       "tx_hash": tx_hash,
        #       "settlement_state": data["state"],
        #       "custodian_ref": data["reference_id"],
        #       "checked_at": datetime.now(timezone.utc).isoformat(),
        #   }
        # ─────────────────────────────────────────────────────────────────────

        logger.error(
            "Custodian API credentials configured but real HTTP integration not yet implemented. "
            "Implement the EXTERNAL_DEPENDENCY block in settlement.py."
        )
        return {
            "status": "not_implemented",
            "tx_hash": tx_hash,
            "message": (
                "Custodian API credentials are present but the real HTTP integration has not been "
                "implemented yet. See the EXTERNAL_DEPENDENCY block in settlement.py."
            ),
        }

    def initiate_custody_wire(
        self,
        investor_address: str,
        amount_usdc: float,
        mandate_id: str,
    ) -> Dict[str, Any]:
        """Dispatch an institutional subscription/settlement request to the custodian.

        DEMO/TESTNET → explicit simulation label, no wire initiated.
        PRODUCTION without credentials → explicit external_dependency_required.
        PRODUCTION with credentials → real custodian API call.

        IMPORTANT: This function NEVER returns success=True without a real API round-trip.
        """
        if not self.custodian_api_url or not self.client_id:
            return self._missing_credentials_wire()

        if self._demo:
            return self._demo_wire(investor_address, amount_usdc, mandate_id)

        logger.info(
            "Initiating institutional Treasury subscription for %s: $%.2f under mandate %s...",
            investor_address, amount_usdc, mandate_id[:10]
        )

        # ── REAL CUSTODIAN API INTEGRATION POINT ─────────────────────────────
        # EXTERNAL_DEPENDENCY: Replace the block below with the real subscription
        # request to your custodian / broker-dealer / tokenized-T-Bill issuer.
        #
        # Example (generic institutional API):
        #   import requests
        #   payload = {
        #       "investor_address": investor_address,
        #       "amount_usdc": amount_usdc,
        #       "mandate_id": mandate_id,
        #       "settlement_currency": "USDC",
        #       "network": "arbitrum_one",
        #   }
        #   resp = requests.post(
        #       f"{self.custodian_api_url}/v1/subscriptions",
        #       json=payload,
        #       headers={"Authorization": f"Bearer {self.client_id}"},
        #       timeout=30,
        #   )
        #   resp.raise_for_status()
        #   data = resp.json()
        #   return {
        #       "success": True,
        #       "order_id": data["order_id"],
        #       "state": data["state"],
        #       "custodian_ref": data["reference"],
        #       "initiated_at": datetime.now(timezone.utc).isoformat(),
        #   }
        # ─────────────────────────────────────────────────────────────────────

        logger.error(
            "Custodian API URL configured but real HTTP integration not yet implemented. "
            "Implement the EXTERNAL_DEPENDENCY block in settlement.py."
        )
        return {
            "success": False,
            "status": "not_implemented",
            "message": (
                "Custodian API URL is present but the real HTTP integration has not been "
                "implemented yet. See the EXTERNAL_DEPENDENCY block in settlement.py."
            ),
        }

    def generate_order_id(self, investor_address: str, mandate_id: str, timestamp: Optional[str] = None) -> str:
        """Deterministic, non-sequential order ID for internal tracking.
        Does NOT represent a real custodian order until the API is integrated.
        """
        ts = timestamp or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        raw = f"{investor_address}-{mandate_id}-{ts}"
        return "ORD-" + hashlib.sha256(raw.encode()).hexdigest()[:16].upper()
