import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest
from eth_account import Account
from agent.rwa_provider import RWADataProvider
from agent.settlement import CustodySettlementManager, SettlementState
from agent.monitor import ProductionMonitor


def test_rwa_provider_missing_credentials(monkeypatch):
    import agent.config as cfg
    monkeypatch.setattr(cfg, "MOCK_MODE", False)
    monkeypatch.setattr(cfg, "NETWORK", "arbitrum_sepolia")
    monkeypatch.setattr(cfg, "RWA_DATA_PROVIDER_URL", None)
    monkeypatch.setattr(cfg, "RWA_PRICE_FEED_ADDRESS", None)
    provider = RWADataProvider(provider_url=None, feed_address=None)
    res = provider.fetch_live_rwa_state("0xAsset")
    assert res["status"] == "external_dependency_required"
    assert "Missing RWA_DATA_PROVIDER_URL" in res["error"]


def test_rwa_provider_attestation_signing(monkeypatch):
    acct = Account.create()
    monkeypatch.setattr("agent.config.ORACLE_ATTESTATION_SIGNER_KEY", acct.key.hex())

    provider = RWADataProvider()
    res = provider.sign_attestation(
        chain_id=421614,
        verifying_contract="0x1111111111111111111111111111111111111111",
        asset="0x2222222222222222222222222222222222222222",
        nav=1050000000000000000,
        nav_timestamp=1700000000,
        redemption_open=True,
        liquidity_tier=2,
        nonce=1,
        deadline=1700000600,
    )

    assert "signature" in res
    assert res["signer"].lower() == acct.address.lower()
    assert res["attestation"]["nav"] == 1050000000000000000


def test_settlement_manager_external_dependency():
    settlement = CustodySettlementManager(custodian_api_url=None, client_id=None)
    status = settlement.get_settlement_status("0xtxhash123")
    assert status["status"] == "external_dependency_required"
    assert status["settlement_state"] == SettlementState.PENDING_DEPOSIT.value
    assert "CUSTODIAN_API_URL" in status["required_credentials"]

    wire_res = settlement.initiate_custody_wire("0xInvestor", 1000.0, "mandate-1")
    assert wire_res["success"] is False
    assert wire_res["status"] == "external_dependency_required"


def test_production_monitor_nav_staleness():
    monitor = ProductionMonitor()

    # Case 1: Healthy
    res_healthy = monitor.check_nav_freshness(nav_updated_at=1000, max_nav_age=300, current_time=1100)
    assert res_healthy["status"] == "HEALTHY"
    assert res_healthy["is_stale"] is False

    # Case 2: Near Expiry (age 250s >= 80% of 300s = 240s)
    res_near = monitor.check_nav_freshness(nav_updated_at=1000, max_nav_age=300, current_time=1250)
    assert res_near["status"] == "EXPIRING_SOON"
    assert res_near["near_expiry"] is True

    # Case 3: Stale (age 350s > 300s)
    res_stale = monitor.check_nav_freshness(nav_updated_at=1000, max_nav_age=300, current_time=1350)
    assert res_stale["status"] == "STALE"
    assert res_stale["is_stale"] is True


def test_production_monitor_budget_utilization():
    monitor = ProductionMonitor()

    # 50% utilization
    res_half = monitor.check_mandate_budget(used=50_000, max_cumulative=100_000)
    assert res_half["utilization_percent"] == 50.0
    assert res_half["saturated"] is False
    assert res_half["near_saturation"] is False

    # 90% utilization (near saturation >= 85%)
    res_high = monitor.check_mandate_budget(used=90_000, max_cumulative=100_000)
    assert res_high["utilization_percent"] == 90.0
    assert res_high["near_saturation"] is True
    assert res_high["saturated"] is False

    # 100% saturation
    res_sat = monitor.check_mandate_budget(used=100_000, max_cumulative=100_000)
    assert res_sat["saturated"] is True


def test_production_monitor_event_handling():
    monitor = ProductionMonitor()
    # Ensure event logging handlers execute without error
    monitor.handle_event("ExecutionBlocked", {"mandateId": "0x123", "agent": "0x456", "reason": "0xNavStale"})
    monitor.handle_event("GateWasPaused", {"by": "0xAdmin"})
    monitor.handle_event("GateWasUnpaused", {"by": "0xAdmin"})
    monitor.handle_event("Executed", {"amount": 250000})


def test_rwa_provider_production_hard_failure(monkeypatch):
    import agent.config as cfg
    monkeypatch.setattr(cfg, "NETWORK", "arbitrum_one")
    monkeypatch.setattr(cfg, "MOCK_MODE", False)
    provider = RWADataProvider(provider_url=None)
    with pytest.raises(EnvironmentError, match="PRODUCTION CONFIGURATION ERROR"):
        provider.fetch_live_rwa_state("0xAsset")


def test_rwa_provider_demo_mode_isolation(monkeypatch):
    import agent.config as cfg
    monkeypatch.setattr(cfg, "MOCK_MODE", True)
    monkeypatch.setattr(cfg, "NETWORK", "mock")
    provider = RWADataProvider(provider_url="https://api.example.com/rwa")
    res = provider.fetch_live_rwa_state("0xAsset")
    assert res["status"] == "demo_simulation"
    assert "DEMO/MOCK" in res["message"]


def test_settlement_manager_production_not_implemented(monkeypatch):
    import agent.config as cfg
    monkeypatch.setattr(cfg, "NETWORK", "arbitrum_one")
    monkeypatch.setattr(cfg, "MOCK_MODE", False)
    settlement = CustodySettlementManager(
        custodian_api_url="https://api.custodian.example.com",
        client_id="inst_client_123"
    )
    res = settlement.get_settlement_status("0xtxhash999")
    assert res["status"] == "not_implemented"
    assert "EXTERNAL_DEPENDENCY" in res["message"]


def test_indexer_client_missing_url(monkeypatch):
    from agent.indexer import IndexerClient
    import agent.config as cfg
    monkeypatch.setattr(cfg, "MOCK_MODE", False)
    monkeypatch.setattr(cfg, "NETWORK", "arbitrum_one")
    client = IndexerClient(graphql_url=None)
    res = client.get_execution_history("0xmandate123")
    assert res["status"] == "external_dependency_required"
    assert "INDEXER_GRAPHQL_URL" in res["error"]


def test_indexer_client_demo_mode(monkeypatch):
    from agent.indexer import IndexerClient
    import agent.config as cfg
    monkeypatch.setattr(cfg, "MOCK_MODE", True)
    client = IndexerClient()
    res = client.get_execution_history("0xmandate123")
    assert res["status"] == "demo_simulation"
    assert len(res["executions"]) > 0


def test_is_us_treasury_market_open():
    from agent.rwa_provider import is_us_treasury_market_open
    from zoneinfo import ZoneInfo
    import datetime

    tz = ZoneInfo("America/New_York")
    # Tuesday 11:00 AM EST (Regular business hours)
    open_dt = datetime.datetime(2026, 4, 7, 11, 0, 0, tzinfo=tz)
    is_open, reason = is_us_treasury_market_open(open_dt)
    assert is_open is True
    assert "active" in reason.lower()

    # Sunday 11:00 AM EST (Weekend)
    weekend_dt = datetime.datetime(2026, 4, 5, 11, 0, 0, tzinfo=tz)
    is_open, reason = is_us_treasury_market_open(weekend_dt)
    assert is_open is False
    assert "weekend" in reason.lower()

    # Good Friday 2026 (April 3, 2026 - SIFMA holiday)
    holiday_dt = datetime.datetime(2026, 4, 3, 11, 0, 0, tzinfo=tz)
    is_open, reason = is_us_treasury_market_open(holiday_dt)
    assert is_open is False
    assert "holiday" in reason.lower()

    # Tuesday 3:00 PM EST (After 2:00 PM cutoff)
    after_cutoff_dt = datetime.datetime(2026, 4, 7, 15, 0, 0, tzinfo=tz)
    is_open, reason = is_us_treasury_market_open(after_cutoff_dt)
    assert is_open is False
    assert "cutoff" in reason.lower()


def test_fetch_onchain_feed_nav():
    from unittest.mock import MagicMock
    from agent.rwa_provider import fetch_onchain_feed_nav

    mock_w3 = MagicMock()
    mock_contract = MagicMock()
    mock_w3.eth.contract.return_value = mock_contract

    # Mock 8 decimals, price $1.0525 (105250000), round 10, updated 1700000000
    mock_contract.functions.decimals().call.return_value = 8
    mock_contract.functions.latestRoundData().call.return_value = (
        10, 105250000, 1700000000, 1700000000, 10
    )

    feed_res = fetch_onchain_feed_nav(mock_w3, "0xc0952c8ba068c887B675B4182F3A65420D045F46")
    # 105250000 * 10^10 = 1052500000000000000 (1.0525e18)
    assert feed_res["nav_wei"] == 1052500000000000000
    assert feed_res["timestamp"] == 1700000000


def test_rwa_provider_onchain_feed(monkeypatch):
    from unittest.mock import MagicMock
    import agent.config as cfg
    monkeypatch.setattr(cfg, "MOCK_MODE", False)
    monkeypatch.setattr(cfg, "NETWORK", "arbitrum_one")

    mock_w3 = MagicMock()
    mock_contract = MagicMock()
    mock_w3.eth.contract.return_value = mock_contract
    mock_contract.functions.decimals().call.return_value = 8
    mock_contract.functions.latestRoundData().call.return_value = (
        1, 105300000, 1700000000, 1700000000, 1
    )

    provider = RWADataProvider(
        feed_address="0xc0952c8ba068c887B675B4182F3A65420D045F46",
        w3=mock_w3,
    )
    state = provider.fetch_live_rwa_state("0xF84D28A8D28292842dD73D1c5F99476A80b6666A")
    assert state["status"] == "success"
    assert state["source"] == "arbitrum_onchain_feed"
    assert state["nav"] == 1053000000000000000



