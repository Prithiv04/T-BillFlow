"""Institutional Indexer / Subgraph integration boundary for T-BillFlow.

Provides an on-chain event query abstraction for:
- Executed (successful gate executions)
- ExecutionBlocked (rejected executions with failure reasons)
- MandateGranted, MandateRevoked, MandateExtended
- AssetStateUpdated (RWA NAV and eligibility updates)

Integration Modes:
─────────────────
DEMO/MOCK   → Returns simulated execution history.
TESTNET     → Queries Arbiscan or testnet Subgraph endpoint if configured.
PRODUCTION  → Queries institutional Subgraph (The Graph / Goldsky / Envio).
              If INDEXER_GRAPHQL_URL is missing, returns explicit
              external_dependency_required status (NEVER fake history).
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from . import config
from .logger import get_logger

logger = get_logger(__name__)

# Standard GraphQL query for execution history
_EXECUTION_HISTORY_QUERY = """
query GetExecutionHistory($mandateId: String!, $first: Int!) {
  executions(
    where: { mandateId: $mandateId }
    orderBy: timestamp
    orderDirection: desc
    first: $first
  ) {
    id
    mandateId
    agent
    target
    selector
    amount
    timestamp
    transactionHash
  }
}
"""

_EXECUTION_BLOCKED_QUERY = """
query GetBlockedExecutions($mandateId: String!, $first: Int!) {
  executionBlockeds(
    where: { mandateId: $mandateId }
    orderBy: timestamp
    orderDirection: desc
    first: $first
  ) {
    id
    mandateId
    agent
    reason
    timestamp
    transactionHash
  }
}
"""


class IndexerClient:
    """Production Indexer client for querying on-chain T-BillFlow history."""

    def __init__(self, graphql_url: Optional[str] = None):
        self.graphql_url = graphql_url or os.getenv("INDEXER_GRAPHQL_URL")
        self.network = config.NETWORK

    def get_execution_history(
        self,
        mandate_id: str,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Fetch historical executions for a given mandate.

        Returns:
            Dict containing status, executions list, and provenance metadata.
        """
        if config.MOCK_MODE or self.network == "mock":
            logger.info("[DEMO] Returning simulated execution history for mandate %s", mandate_id[:10])
            return {
                "status": "demo_simulation",
                "mandate_id": mandate_id,
                "executions": [
                    {
                        "id": "demo-exec-1",
                        "mandateId": mandate_id,
                        "agent": "0xDemoAgent",
                        "target": config.VAULT_ADDRESS or "0xVault",
                        "selector": "0x6e553f65",
                        "amount": "1000000",
                        "timestamp": int(datetime.now(timezone.utc).timestamp()) - 3600,
                        "transactionHash": "0x0000000000000000000000000000000000000001",
                    }
                ],
                "mode": "demo",
            }

        if not self.graphql_url:
            if self.network == "arbitrum_one":
                logger.warning(
                    "EXTERNAL_DEPENDENCY: INDEXER_GRAPHQL_URL not configured on Arbitrum One. "
                    "Production history requires a deployed Subgraph (The Graph / Goldsky)."
                )
            return {
                "status": "external_dependency_required",
                "mandate_id": mandate_id,
                "executions": [],
                "error": "Missing INDEXER_GRAPHQL_URL in environment",
                "action_required": (
                    "Deploy the T-BillFlow subgraph to The Graph decentralized network or Goldsky, "
                    "and configure INDEXER_GRAPHQL_URL in .env."
                ),
            }

        # ── REAL SUBGRAPH / INDEXER INTEGRATION POINT ────────────────────────
        # EXTERNAL_DEPENDENCY: The HTTP POST below targets a standard GraphQL
        # endpoint (The Graph / Goldsky).
        # ─────────────────────────────────────────────────────────────────────
        try:
            import urllib.request
            import json

            payload = json.dumps({
                "query": _EXECUTION_HISTORY_QUERY,
                "variables": {"mandateId": mandate_id.lower(), "first": limit}
            }).encode("utf-8")

            req = urllib.request.Request(
                self.graphql_url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            if "errors" in data:
                return {
                    "status": "indexer_error",
                    "errors": data["errors"],
                    "executions": [],
                }

            return {
                "status": "success",
                "mandate_id": mandate_id,
                "executions": data.get("data", {}).get("executions", []),
            }
        except Exception as e:
            logger.error("Failed to query indexer: %s", e)
            return {
                "status": "indexer_connection_failed",
                "error": str(e),
                "executions": [],
            }
