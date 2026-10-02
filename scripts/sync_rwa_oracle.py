#!/usr/bin/env python3
"""Sync RWA State Oracle with Real Arbitrum Treasury Data / Live Feeds.

Connects to Arbitrum One or Arbitrum Sepolia, evaluates live market data:
- On-chain Aggregator feed (e.g. OpenEden TBILL oracle 0xc0952c8ba068c887B675B4182F3A65420D045F46)
- Federal Reserve Economic Data (FRED) API for live Treasury yields
- SIFMA / US Treasury trading calendar for redemption eligibility
Submits verified on-chain updates or signed EIP-712 attestations to RWAStateOracle.

Usage:
    python scripts/sync_rwa_oracle.py [--mode attestation|feed] [--dry-run]
"""

import os
import sys
import argparse
from web3 import Web3

# Add repo root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent import config
from agent.contracts import build_web3, RWAStateOracle
from agent.rwa_provider import (
    RWADataProvider,
    is_us_treasury_market_open,
    fetch_onchain_feed_nav,
    fetch_fred_treasury_yield,
)
from agent.logger import get_logger

logger = get_logger("sync_rwa_oracle")


def main():
    parser = argparse.ArgumentParser(description="Synchronize RWA State Oracle with live data")
    parser.add_argument("--mode", choices=["feed", "attestation"], default="attestation",
                        help="Update mode: direct feed trigger or signed EIP-712 attestation")
    parser.add_argument("--dry-run", action="store_true", help="Print verified metrics without sending tx")
    args = parser.parse_args()

    logger.info("=== T-BillFlow RWA Oracle Synchronizer ===")
    logger.info("Network: %s | Mock Mode: %s", config.NETWORK, config.MOCK_MODE)

    if config.MOCK_MODE:
        logger.info("[DEMO/MOCK] Oracle synchronization skipped in mock mode.")
        return

    if not config.RPC_URL:
        logger.error("No RPC_URL configured for network %s", config.NETWORK)
        sys.exit(1)

    w3 = build_web3(config.RPC_URL)
    oracle_addr = config.ORACLE_ADDRESS
    asset_addr = config.ASSET_ADDRESS

    if not oracle_addr:
        logger.error("RWA_STATE_ORACLE_ADDRESS not configured in environment")
        sys.exit(1)

    oracle = RWAStateOracle(oracle_addr, w3)
    logger.info("Target Oracle: %s", oracle_addr)
    logger.info("Target Asset:  %s", asset_addr)

    # 1. Evaluate US Treasury market hours and redemption window
    is_open, market_reason = is_us_treasury_market_open()
    logger.info("SIFMA Treasury Market Status: %s (%s)", "OPEN" if is_open else "CLOSED", market_reason)

    # 2. Check Macro yield from FRED if key configured
    fred_yield = None
    if config.FRED_API_KEY:
        fred_yield = fetch_fred_treasury_yield(config.FRED_API_KEY)
        logger.info("Federal Reserve FRED (DTB4WK) Live Yield: %s%%", f"{fred_yield:.2f}" if fred_yield else "N/A")

    # 3. Read current on-chain state
    try:
        current_state = oracle.get_asset_state(asset_addr)
        logger.info(
            "Current Oracle State -> NAV: %.4f | Fresh: %s | RedemptionOpen: %s | Tier: %d",
            current_state["nav"] / 1e18,
            oracle.is_nav_fresh(asset_addr),
            current_state["redemptionOpen"],
            current_state["liquidityTier"],
        )
    except Exception as e:
        logger.warning("Could not read current oracle state (asset may not be registered yet): %s", e)

    # 4. Mode: Direct Feed Sync
    if args.mode == "feed":
        feed_addr = config.RWA_PRICE_FEED_ADDRESS
        if not feed_addr and config.NETWORK == "arbitrum_one":
            feed_addr = config.ARBITRUM_ONE_TBILL_ORACLE

        if not feed_addr:
            logger.error("No RWA_PRICE_FEED_ADDRESS configured for feed sync mode")
            sys.exit(1)

        logger.info("Configured On-Chain Feed: %s", feed_addr)
        feed_data = fetch_onchain_feed_nav(w3, feed_addr)
        logger.info("Feed Latest Round NAV: %.6f (timestamp: %d)", feed_data["nav_wei"] / 1e18, feed_data["timestamp"])

        if args.dry_run:
            logger.info("[DRY-RUN] Would call oracle.syncFromFeed(%s)", asset_addr)
            return

        if not config.PRIVATE_KEY:
            logger.error("PRIVATE_KEY required to broadcast sync transaction")
            sys.exit(1)

        tx_hash = oracle.sync_from_feed(asset_addr, config.PRIVATE_KEY)
        logger.info("Successfully triggered oracle.syncFromFeed()! Tx Hash: %s", tx_hash)

    # 5. Mode: Signed EIP-712 Attestation
    else:
        provider = RWADataProvider(
            feed_address=config.RWA_PRICE_FEED_ADDRESS or (config.ARBITRUM_ONE_TBILL_ORACLE if config.NETWORK == "arbitrum_one" else None),
            fred_api_key=config.FRED_API_KEY,
            w3=w3,
        )
        live_state = provider.fetch_live_rwa_state(asset_addr)
        logger.info("Provider Fetch Result: %s", live_state.get("status"))

        if live_state["status"] != "success":
            logger.error("Failed to fetch verified RWA state: %s", live_state)
            sys.exit(1)

        logger.info(
            "Verified Metrics -> NAV: %.6f | Timestamp: %d | Source: %s | Redemption: %s",
            live_state["nav"] / 1e18,
            live_state["nav_timestamp"],
            live_state.get("source"),
            live_state["redemption_open"],
        )

        if args.dry_run:
            logger.info("[DRY-RUN] Verification complete. Attestation signing skipped in dry-run mode.")
            return

        if not config.ORACLE_ATTESTATION_SIGNER_KEY and not config.PRIVATE_KEY:
            logger.error("Attestation signing requires ORACLE_ATTESTATION_SIGNER_KEY or PRIVATE_KEY")
            sys.exit(1)

        signer_key = config.ORACLE_ATTESTATION_SIGNER_KEY or config.PRIVATE_KEY
        provider.signer_key = signer_key

        chain_id = w3.eth.chain_id
        nonce = int(live_state["nav_timestamp"])  # monotonic nonce from timestamp
        attestation_res = provider.sign_attestation(
            chain_id=chain_id,
            verifying_contract=oracle_addr,
            asset=asset_addr,
            nav=live_state["nav"],
            nav_timestamp=live_state["nav_timestamp"],
            redemption_open=live_state["redemption_open"],
            liquidity_tier=live_state["liquidity_tier"],
            nonce=nonce,
            deadline=int(live_state["nav_timestamp"]) + 1800,  # 30 min deadline
        )

        logger.info("Attestation signed by provider: %s", attestation_res["signer"])
        logger.info("Signature: %s...", attestation_res["signature"][:20])

        # Submit to oracle via updateAssetStateWithAttestation
        caller_key = config.PRIVATE_KEY or signer_key
        acct = w3.eth.account.from_key(caller_key)
        att = attestation_res["attestation"]
        att_tuple = (
            Web3.to_checksum_address(att["asset"]),
            att["nav"],
            att["navTimestamp"],
            att["redemptionOpen"],
            att["liquidityTier"],
            att["nonce"],
            att["deadline"],
        )
        sig_bytes = bytes.fromhex(attestation_res["signature"][2:] if attestation_res["signature"].startswith("0x") else attestation_res["signature"])

        tx = oracle.contract.functions.updateAssetStateWithAttestation(
            att_tuple, sig_bytes
        ).build_transaction({
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "gas": 350_000,
            "maxFeePerGas": w3.eth.get_block("latest").get("baseFeePerGas", 0) * 2 + Web3.to_wei(0.1, "gwei"),
            "maxPriorityFeePerGas": Web3.to_wei(0.1, "gwei"),
            "type": 2,
        })
        signed_tx = acct.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        logger.info("Submitted updateAssetStateWithAttestation()! Tx Hash: %s", tx_hash.hex())


if __name__ == "__main__":
    main()
