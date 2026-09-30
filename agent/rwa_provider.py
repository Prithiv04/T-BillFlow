"""Production-grade RWA Data Provider Integration & Attestation Service.

Connects to institutional RWA data sources (e.g. Ondo, Securitize, Superstate, Chainlink)
to obtain authentic NAV, timestamps, liquidity tiers, and redemption window statuses.
Constructs and signs EIP-712 attestations for submission to RWAStateOracle.

EXTERNAL DEPENDENCIES:
──────────────────────
1. RWA_DATA_PROVIDER_URL: Upstream institutional data feed endpoint.
   EXTERNAL_DEPENDENCY — provider onboarding required (e.g. Ondo Finance API,
   Securitize Markets, Superstate investor portal, or Chainlink Data Streams).

2. RWA_PROVIDER_API_KEY: API key issued by the data provider after onboarding.
   EXTERNAL_DEPENDENCY — requires institutional API agreement.

3. ORACLE_ATTESTATION_SIGNER_KEY: Private key of the on-chain approved provider address.
   EXTERNAL_DEPENDENCY — key must be registered via RWAStateOracle.setApprovedProvider().
   Never commit this key. Store in a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault).

Integration boundary: When a real provider is configured, the fetch_live_rwa_state()
method issues a real HTTP request. All other protocol code (signing, submission) is
fully implemented and requires no changes.
"""

import time
import requests
from typing import Dict, Any, Optional
from eth_account import Account
from eth_account.messages import encode_typed_data

from . import config
from .logger import get_logger

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# EIP-712 Attestation type structure (must match RWAStateOracle.ATTESTATION_TYPEHASH)
# ─────────────────────────────────────────────────────────────────────────────

ATTESTATION_TYPES = {
    "EIP712Domain": [
        {"name": "name", "type": "string"},
        {"name": "version", "type": "string"},
        {"name": "chainId", "type": "uint256"},
        {"name": "verifyingContract", "type": "address"},
    ],
    "RWAAttestation": [
        {"name": "asset", "type": "address"},
        {"name": "nav", "type": "uint256"},
        {"name": "navTimestamp", "type": "uint256"},
        {"name": "redemptionOpen", "type": "bool"},
        {"name": "liquidityTier", "type": "uint8"},
        {"name": "nonce", "type": "uint256"},
        {"name": "deadline", "type": "uint256"},
    ],
}

# Expected fields that a real provider response must include
_REQUIRED_PROVIDER_FIELDS = {"nav_wei", "timestamp", "redemption_open", "liquidity_tier"}


def _is_production_network() -> bool:
    """True only when running against Arbitrum One (mainnet)."""
    return config.NETWORK == "arbitrum_one"


def _is_demo_or_mock() -> bool:
    return config.MOCK_MODE or config.NETWORK == "mock"


class RWADataProvider:
    """Institutional RWA Data Provider and Attestation Signer.

    Modes:
    ─────
    DEMO/MOCK    → No external calls. Returns explicit demo label.
    TESTNET      → Real provider calls if URL configured, else explicit dependency notice.
    PRODUCTION   → Real provider calls mandatory. Missing URL raises immediately.
    """

    def __init__(self, provider_url: Optional[str] = None, api_key: Optional[str] = None):
        self.provider_url = provider_url if provider_url is not None else config.RWA_DATA_PROVIDER_URL
        self.api_key = api_key if api_key is not None else config.RWA_PROVIDER_API_KEY
        self.signer_key = config.ORACLE_ATTESTATION_SIGNER_KEY

    # ─────────────────────────────────────────────────────────────
    # Upstream data fetch
    # ─────────────────────────────────────────────────────────────

    def fetch_live_rwa_state(self, asset_address: str) -> Dict[str, Any]:
        """Fetch real-world asset metrics from the upstream institutional data provider.

        Rules:
        - NEVER fabricates NAV, redemption, or liquidity values in any mode.
        - DEMO/MOCK: returns explicit demo label with no external call.
        - Missing provider URL: returns external_dependency_required (never fake data).
        - Real provider available: issues HTTP request and validates required fields.
        """
        if not self.provider_url:
            if _is_production_network():
                # Hard failure in production — never acceptable to have no data source
                raise EnvironmentError(
                    "PRODUCTION CONFIGURATION ERROR: RWA_DATA_PROVIDER_URL is required "
                    "on Arbitrum One. Configure an institutional RWA data feed. "
                    "See EXTERNAL_DEPENDENCY notes in rwa_provider.py."
                )
            logger.warning(
                "EXTERNAL_DEPENDENCY: RWA_DATA_PROVIDER_URL not configured. "
                "Production RWA state updates require an active institutional data feed."
            )
            return {
                "status": "external_dependency_required",
                "asset": asset_address,
                "error": "Missing RWA_DATA_PROVIDER_URL in environment",
                "action_required": (
                    "Configure RWA_DATA_PROVIDER_URL with an institutional RWA data provider "
                    "(e.g. Ondo Finance, Securitize, Superstate, or Chainlink Data Streams)."
                ),
            }

        if _is_demo_or_mock():
            logger.info("[DEMO] Skipping live RWA data fetch — demo/mock mode active.")
            return {
                "status": "demo_simulation",
                "asset": asset_address,
                "message": (
                    "DEMO/MOCK: No real RWA data fetched. "
                    "Production requires a live institutional data provider."
                ),
                "mode": config.NETWORK,
            }


        # ── REAL PROVIDER API INTEGRATION POINT ──────────────────────────────
        # EXTERNAL_DEPENDENCY: The HTTP request format below uses a generic REST
        # convention. Adjust the endpoint path and response field mapping to match
        # the specific provider's API (Ondo, Securitize, Superstate, etc.).
        # Required response fields: nav_wei (uint256 in wei), timestamp (unix),
        #   redemption_open (bool), liquidity_tier (0–3).
        # ─────────────────────────────────────────────────────────────────────

        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            resp = requests.get(
                f"{self.provider_url}/v1/assets/{asset_address}/state",
                headers=headers,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()

            # Validate required fields are present in the response
            missing = _REQUIRED_PROVIDER_FIELDS - set(data.keys())
            if missing:
                raise ValueError(
                    f"Provider response missing required fields: {missing}. "
                    f"Response: {list(data.keys())}"
                )

            nav_wei = int(data["nav_wei"])
            nav_ts = int(data["timestamp"])
            now = int(time.time())

            # Sanity: provider timestamp should not be in the far future
            if nav_ts > now + 300:
                raise ValueError(
                    f"Provider returned a future navTimestamp: {nav_ts} (current: {now}). "
                    "This is invalid and will be rejected by the oracle."
                )

            return {
                "status": "success",
                "asset": asset_address,
                "nav": nav_wei,
                "nav_timestamp": nav_ts,
                "redemption_open": bool(data["redemption_open"]),
                "liquidity_tier": int(data["liquidity_tier"]),
                "source": data.get("source", "institutional_oracle"),
            }
        except Exception as e:
            logger.error("Failed to fetch upstream RWA state for %s: %s", asset_address, e)
            return {
                "status": "error",
                "asset": asset_address,
                "error": str(e),
            }

    # ─────────────────────────────────────────────────────────────
    # EIP-712 Attestation signing (fully implemented — no ext deps)
    # ─────────────────────────────────────────────────────────────

    def sign_attestation(
        self,
        chain_id: int,
        verifying_contract: str,
        asset: str,
        nav: int,
        nav_timestamp: int,
        redemption_open: bool,
        liquidity_tier: int,
        nonce: int,
        deadline: int,
    ) -> Dict[str, Any]:
        """Create and sign an EIP-712 attestation using the approved provider key.

        The resulting signature can be submitted to RWAStateOracle.updateAssetStateWithAttestation()
        by any relayer — the oracle verifies the signer is an approved provider on-chain.

        Raises ValueError if ORACLE_ATTESTATION_SIGNER_KEY is not configured.
        """
        if not self.signer_key:
            raise ValueError(
                "Missing ORACLE_ATTESTATION_SIGNER_KEY: Cannot sign oracle attestations. "
                "This key must be for an address registered via RWAStateOracle.setApprovedProvider()."
            )

        message = {
            "asset": asset,
            "nav": nav,
            "navTimestamp": nav_timestamp,
            "redemptionOpen": redemption_open,
            "liquidityTier": liquidity_tier,
            "nonce": nonce,
            "deadline": deadline,
        }

        full_data = {
            "types": ATTESTATION_TYPES,
            "primaryType": "RWAAttestation",
            "domain": {
                "name": "TBillFlow-RWA-Oracle",
                "version": "1",
                "chainId": chain_id,
                "verifyingContract": verifying_contract,
            },
            "message": message,
        }

        encoded_data = encode_typed_data(full_message=full_data)
        signed = Account.sign_message(encoded_data, private_key=self.signer_key)

        return {
            "attestation": message,
            "signature": signed.signature.hex(),
            "signer": Account.from_key(self.signer_key).address,
        }

    def fetch_and_sign(
        self,
        chain_id: int,
        verifying_contract: str,
        asset_address: str,
        nonce: int,
        deadline_offset: int = 600,
    ) -> Dict[str, Any]:
        """Convenience: fetch live state then sign an attestation in one call.

        Returns a dict with keys: status, asset, attestation (dict), signature (hex), signer.
        On any data fetch failure: returns the fetch error dict without signing.
        """
        state = self.fetch_live_rwa_state(asset_address)
        if state["status"] != "success":
            return state

        now = int(time.time())
        deadline = now + deadline_offset

        signed = self.sign_attestation(
            chain_id=chain_id,
            verifying_contract=verifying_contract,
            asset=asset_address,
            nav=state["nav"],
            nav_timestamp=state["nav_timestamp"],
            redemption_open=state["redemption_open"],
            liquidity_tier=state["liquidity_tier"],
            nonce=nonce,
            deadline=deadline,
        )
        return {
            "status": "signed",
            "asset": asset_address,
            "attestation": signed["attestation"],
            "signature": signed["signature"],
            "signer": signed["signer"],
            "source": state.get("source", "institutional_oracle"),
        }
