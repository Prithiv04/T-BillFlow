"""Production-grade RWA Data Provider Integration & Attestation Service.

Connects to institutional RWA data sources (e.g. OpenEden, Ondo, Securitize, Superstate, Chainlink, FRED)
to obtain authentic NAV, timestamps, liquidity tiers, and redemption window statuses.
Constructs and signs EIP-712 attestations for submission to RWAStateOracle.

REAL RWA INTEGRATION ON ARBITRUM:
─────────────────────────────────
1. OpenEden TBILL on Arbitrum One:
   - Token Contract: 0xF84D28A8D28292842dD73D1c5F99476A80b6666A
   - Price Oracle:   0xc0952c8ba068c887B675B4182F3A65420D045F46 (AggregatorV3Interface)
2. Ondo USDY on Arbitrum One:
   - Token Contract: 0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D
3. Macroeconomic Benchmark:
   - Federal Reserve Economic Data (FRED) API (Series DTB4WK / DTB3).

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
"""

import time
import requests
import datetime
from zoneinfo import ZoneInfo
from typing import Dict, Any, Optional, Tuple
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

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

# SIFMA / Federal Reserve U.S. Bond Market Observed Holidays
# Primary redemptions and physical Treasury settlement cannot settle on these days.
# NOTE: This calendar covers 2025–2026. For calendar years 2027 and beyond, add
# dates from the official SIFMA holiday schedule (https://www.sifma.org/resources/general/holiday-schedule/).
SIFMA_HOLIDAYS = {
    # 2025
    "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18",
    "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01",
    "2025-10-13", "2025-11-11", "2025-11-27", "2025-12-25",
    # 2026
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03",
    "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
    "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25",
}


def _is_production_network() -> bool:
    """True only when running against Arbitrum One (mainnet)."""
    return config.NETWORK == "arbitrum_one"


def _is_demo_or_mock() -> bool:
    return config.MOCK_MODE or config.NETWORK == "mock"


# ─────────────────────────────────────────────────────────────────────────────
# Real-World Institutional Rules: Market Hours & Settlement Windows
# ─────────────────────────────────────────────────────────────────────────────

def is_us_treasury_market_open(dt: Optional[datetime.datetime] = None) -> Tuple[bool, str]:
    """Check whether the U.S. Treasury settlement and primary redemption window is open.

    Treasury settlement / primary redemption rules:
    - Monday through Friday only.
    - 9:00 AM to 4:00 PM Eastern Time (EST/EDT).
    - Daily primary redemption cutoff is 2:00 PM Eastern Time (14:00).
    - Excludes SIFMA / Federal Reserve bank holidays.
    """
    try:
        tz = ZoneInfo("America/New_York")
    except Exception:
        tz = datetime.timezone(datetime.timedelta(hours=-5))

    now = dt if dt is not None else datetime.datetime.now(tz)
    # Convert to Eastern Time if tz-aware
    if now.tzinfo is not None:
        now = now.astimezone(tz)
    date_str = now.strftime("%Y-%m-%d")

    # Weekend check
    if now.weekday() >= 5:  # Saturday=5, Sunday=6
        return False, "Market closed: Weekend (Treasury markets operate Monday-Friday)"

    # SIFMA Holiday check
    if date_str in SIFMA_HOLIDAYS:
        return False, f"Market closed: SIFMA/Federal Reserve observed holiday on {date_str}"

    # Time window: 9:00 AM to 2:00 PM Eastern Time
    if now.hour < 9:
        return False, "Market not yet open (Opens 9:00 AM Eastern Time)"
    if now.hour >= 14:
        return False, "Redemption window closed (Daily cutoff 2:00 PM Eastern Time)"

    return True, "Open: Treasury primary redemption window active"


def fetch_onchain_feed_nav(w3: Web3, feed_address: str) -> Dict[str, Any]:
    """Read NAV and timestamp directly from an on-chain AggregatorV3 feed
    (e.g. OpenEden TBILL Oracle 0xc0952c8ba068c887B675B4182F3A65420D045F46 on Arbitrum One).
    """
    aggregator_abi = [
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [],
            "name": "latestRoundData",
            "outputs": [
                {"internalType": "uint80", "name": "roundId", "type": "uint80"},
                {"internalType": "int256", "name": "answer", "type": "int256"},
                {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
                {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
                {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
    ]
    contract = w3.eth.contract(address=Web3.to_checksum_address(feed_address), abi=aggregator_abi)
    decimals = contract.functions.decimals().call()
    round_data = contract.functions.latestRoundData().call()
    round_id, answer, started_at, updated_at, answered_in_round = round_data

    if answer <= 0:
        raise ValueError(f"Oracle returned invalid non-positive answer: {answer}")
    if updated_at == 0:
        raise ValueError("Oracle returned zero timestamp")
    if answered_in_round < round_id:
        raise ValueError(f"Stale round: answeredInRound {answered_in_round} < roundId {round_id}")

    # Scale answer to 18 decimals
    if decimals <= 18:
        nav_wei = int(answer) * (10 ** (18 - decimals))
    else:
        nav_wei = int(answer) // (10 ** (decimals - 18))

    return {
        "nav_wei": nav_wei,
        "timestamp": int(updated_at),
        "feed_address": feed_address,
        "round_id": round_id,
        "raw_answer": answer,
        "decimals": decimals,
    }


def fetch_fred_treasury_yield(api_key: str, series_id: str = "DTB4WK") -> Optional[float]:
    """Fetch live US Treasury Bill rate from Federal Reserve Economic Data (FRED) API.

    Series:
    - DTB4WK: 4-Week Treasury Bill Secondary Market Rate (Discount Basis)
    - DTB3: 3-Month Treasury Bill Secondary Market Rate (Discount Basis)
    """
    if not api_key:
        return None
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "sort_order": "desc",
        "limit": 5,
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        observations = data.get("observations", [])
        for obs in observations:
            val = obs.get("value")
            if val and val != ".":
                return float(val)
        return None
    except Exception as e:
        logger.warning("Failed to fetch FRED yield for %s: %s", series_id, e)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Institutional RWA Data Provider Class
# ─────────────────────────────────────────────────────────────────────────────

class RWADataProvider:
    """Institutional RWA Data Provider and Attestation Signer.

    Modes:
    ─────
    DEMO/MOCK    → No external calls. Returns explicit demo label.
    TESTNET      → Real provider calls if URL or feed configured, else explicit dependency notice.
    PRODUCTION   → Real provider calls mandatory. Missing URL and feed raises immediately.
    """

    def __init__(
        self,
        provider_url: Optional[str] = None,
        api_key: Optional[str] = None,
        feed_address: Optional[str] = None,
        fred_api_key: Optional[str] = None,
        w3: Optional[Web3] = None,
    ):
        self.provider_url = provider_url if provider_url is not None else config.RWA_DATA_PROVIDER_URL
        self.api_key = api_key if api_key is not None else config.RWA_PROVIDER_API_KEY
        self.feed_address = feed_address if feed_address is not None else config.RWA_PRICE_FEED_ADDRESS
        self.fred_api_key = fred_api_key if fred_api_key is not None else config.FRED_API_KEY
        self.signer_key = config.ORACLE_ATTESTATION_SIGNER_KEY
        self.w3 = w3

    # ─────────────────────────────────────────────────────────────
    # Upstream data fetch
    # ─────────────────────────────────────────────────────────────

    def fetch_live_rwa_state(self, asset_address: str) -> Dict[str, Any]:
        """Fetch real-world asset metrics from the upstream institutional data provider.

        Rules:
        - NEVER fabricates NAV, redemption, or liquidity values in any mode.
        - DEMO/MOCK: returns explicit demo label with no external call.
        - Missing provider URL & on-chain feed: returns external_dependency_required (or raises in prod).
        - Real provider or on-chain feed available: queries real data and validates required fields.
        """
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

        # Check if any production data source is configured
        if not self.provider_url and not self.feed_address:
            if _is_production_network():
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

        # ── Path 1: Direct On-Chain Aggregator Feed (Arbitrum One) ───────────
        if self.feed_address and self.w3:
            try:
                feed_data = fetch_onchain_feed_nav(self.w3, self.feed_address)
                redemption_open, reason = is_us_treasury_market_open()
                fred_yield = (
                    fetch_fred_treasury_yield(self.fred_api_key)
                    if self.fred_api_key
                    else None
                )
                return {
                    "status": "success",
                    "asset": asset_address,
                    "nav": feed_data["nav_wei"],
                    "nav_timestamp": feed_data["timestamp"],
                    "redemption_open": redemption_open,
                    "redemption_reason": reason,
                    "liquidity_tier": 3 if redemption_open else 1,
                    "source": "arbitrum_onchain_feed",
                    "feed_address": self.feed_address,
                    "macro_yield_percent": fred_yield,
                }
            except Exception as e:
                logger.error("Failed to read on-chain feed %s: %s", self.feed_address, e)
                if not self.provider_url:
                    return {
                        "status": "error",
                        "asset": asset_address,
                        "error": str(e),
                    }

        # ── Path 2: Institutional REST API Provider ──────────────────────────
        if self.provider_url:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            try:
                resp = requests.get(
                    f"{self.provider_url}/v1/assets/{asset_address}/state",
                    headers=headers,
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()

                missing = _REQUIRED_PROVIDER_FIELDS - set(data.keys())
                if missing:
                    raise ValueError(
                        f"Provider response missing required fields: {missing}. "
                        f"Response: {list(data.keys())}"
                    )

                nav_wei = int(data["nav_wei"])
                nav_ts = int(data["timestamp"])
                now = int(time.time())

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

        return {
            "status": "external_dependency_required",
            "asset": asset_address,
            "error": "No viable data provider or feed available",
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
        """Convenience: fetch live state then sign an attestation in one call."""
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
