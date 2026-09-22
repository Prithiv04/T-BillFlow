import os
import builtins
from unittest.mock import MagicMock, call
import pytest

# Ensure the agent package uses the test-specific environment variables
# The agent's config reads from os.getenv at import time, so we set them before import
@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    # Core variables – values can be overridden per‑test if needed
    monkeypatch.setenv("ARBITRUM_SEPOLIA_RPC_URL", "http://example.com")
    monkeypatch.setenv("PRIVATE_KEY", "0xdeadbeef")
    monkeypatch.setenv("AGENT_EXECUTION_GATE_ADDRESS", "0xGate")
    monkeypatch.setenv("TBILL_VAULT_ADDRESS", "0xVault")
    monkeypatch.setenv("RWA_STATE_ORACLE_ADDRESS", "0xOracle")
    monkeypatch.setenv("RWA_ASSET_ADDRESS", "0xAsset")
    monkeypatch.setenv("YIELD_THRESHOLD", "5.0")
    monkeypatch.setenv("POLL_INTERVAL", "1")
    monkeypatch.setenv("CURRENT_YIELD", "6.5")
    monkeypatch.setenv("AGENT_MOCK_MODE", "false")  # force real‑mode so we can inject mocks
    # Import after env is set so config picks up the values
    import importlib
    import agent.config as cfg
    importlib.reload(cfg)
    yield

# Helper to build a minimal OffChainAgent with mocked contract objects
@pytest.fixture
def agent_with_mocks(monkeypatch):
    from agent.agent import OffChainAgent
    # Create mock contract objects
    mock_gate = MagicMock()
    mock_oracle = MagicMock()
    mock_vault = MagicMock()

    # Patch the constructors in contracts module to return our mocks
    import agent.contracts as contracts
    monkeypatch.setattr(contracts, "AgentExecutionGate", lambda address, w3: mock_gate)
    monkeypatch.setattr(contracts, "RWAStateOracle", lambda address, w3: mock_oracle)
    monkeypatch.setattr(contracts, "TBillVault", lambda address, w3: mock_vault)

    # Patch the web3 builder to avoid real network calls
    from agent.agent import _build_web3
    monkeypatch.setattr("agent.agent._build_web3", lambda: MagicMock())

    # Instantiate the agent – it will receive the mocked contracts
    agent = OffChainAgent()
    # Verify that the agent holds our mocks (sanity check)
    assert agent.gate is mock_gate
    assert agent.oracle is mock_oracle
    assert agent.vault is mock_vault
    return agent, mock_gate, mock_oracle, mock_vault

def test_yield_below_threshold(agent_with_mocks, capsys):
    agent, mock_gate, mock_oracle, _ = agent_with_mocks
    # Set synthetic yield below threshold via env (already set to 6.5, override)
    os.environ["CURRENT_YIELD"] = "4.0"
    # Reload config to pick up new yield
    import importlib, agent.config as cfg
    importlib.reload(cfg)
    # Ensure oracle reports eligible so that only yield matters
    mock_oracle.is_eligible.return_value = True
    mock_gate.can_execute.return_value = True

    agent.run_once()
    # execute should never be called because yield is low
    mock_gate.execute.assert_not_called()
    captured = capsys.readouterr().out
    assert "Yield condition not met" in captured

def test_yield_ok_oracle_ineligible(agent_with_mocks, capsys):
    agent, mock_gate, mock_oracle, _ = agent_with_mocks
    # Yield meets threshold (default 6.5 >= 5.0)
    mock_oracle.is_eligible.return_value = False  # ineligible
    mock_gate.can_execute.return_value = True

    agent.run_once()
    mock_gate.execute.assert_not_called()
    captured = capsys.readouterr().out
    assert "Oracle eligibility" in captured
    assert "waiting for next poll" in captured.lower()

def test_mandate_invalid(agent_with_mocks, capsys):
    agent, mock_gate, mock_oracle, _ = agent_with_mocks
    mock_oracle.is_eligible.return_value = True
    mock_gate.can_execute.return_value = True
    # Patch the private method to simulate an invalid mandate
    agent._mandate_valid = MagicMock(return_value=False)

    agent.run_once()
    mock_gate.execute.assert_not_called()
    captured = capsys.readouterr().out
    assert "Mandate not valid" in captured

def test_gate_cannot_execute(agent_with_mocks, capsys):
    agent, mock_gate, mock_oracle, _ = agent_with_mocks
    mock_oracle.is_eligible.return_value = True
    mock_gate.can_execute.return_value = False

    agent.run_once()
    mock_gate.execute.assert_not_called()
    captured = capsys.readouterr().out
    assert "Gate rejected execution" in captured

def test_successful_execution(agent_with_mocks, capsys):
    agent, mock_gate, mock_oracle, _ = agent_with_mocks
    mock_oracle.is_eligible.return_value = True
    mock_gate.can_execute.return_value = True
    mock_gate.execute.return_value = "0xdeadbeef"

    agent.run_once()
    # execute should be called exactly once with the request dict
    assert mock_gate.execute.call_count == 1
    args, kwargs = mock_gate.execute.call_args
    request, pk = args
    assert isinstance(request, dict)
    assert request["vault"] == os.getenv("TBILL_VAULT_ADDRESS")
    assert request["asset"] == os.getenv("RWA_ASSET_ADDRESS")
    assert pk == os.getenv("PRIVATE_KEY")
    captured = capsys.readouterr().out
    assert "Executed via AgentExecutionGate" in captured

def test_vault_never_called(agent_with_mocks, capsys):
    agent, mock_gate, mock_oracle, mock_vault = agent_with_mocks
    mock_oracle.is_eligible.return_value = True
    mock_gate.can_execute.return_value = True
    mock_gate.execute.return_value = "0xdeadbeef"

    agent.run_once()
    mock_vault.assert_not_called()

def test_mock_mode_never_broadcast(monkeypatch, capsys):
    # Force mock mode via env variable
    monkeypatch.setenv("AGENT_MOCK_MODE", "true")
    # Reload config and agent module
    import importlib, agent.config as cfg
    importlib.reload(cfg)
    from agent.agent import OffChainAgent
    # In mock mode the agent creates no contract objects
    agent = OffChainAgent()
    # Replace gate with a mock to verify execute is not called
    mock_gate = MagicMock()
    agent.gate = mock_gate
    # Run with yield above threshold – should go through mock path and not call execute
    agent.run_once()
    mock_gate.execute.assert_not_called()
    captured = capsys.readouterr().out
    assert "Mock execution" in captured

def test_secrets_not_logged(monkeypatch, capsys):
    # Ensure mock mode to avoid real execution
    monkeypatch.setenv("AGENT_MOCK_MODE", "true")
    import importlib, agent.config as cfg
    importlib.reload(cfg)
    from agent.agent import OffChainAgent
    agent = OffChainAgent()
    # Run once – logs should not contain the private key
    agent.run_once()
    output = capsys.readouterr().out
    assert os.getenv("PRIVATE_KEY") not in output
    assert "PRIVATE_KEY" not in output
