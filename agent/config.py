# Configuration for the off-chain T-BillFlow agent
"""
Network separation:
  NETWORK=mock              → MOCK_MODE, no real blockchain access
  NETWORK=arbitrum_sepolia  → Testnet (Arbitrum Sepolia chainId 421614)
  NETWORK=arbitrum_one      → Production (Arbitrum One chainId 42161)

LIVE mode NEVER falls back to mock/demo data. Missing production credentials
raise immediately rather than silently using defaults.
"""
import os
from dotenv import load_dotenv

# Load .env from the project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

# ─── Network selection ────────────────────────────────────────────────────────
NETWORK = os.getenv("NETWORK", "arbitrum_sepolia").lower()
MOCK_MODE = os.getenv("AGENT_MOCK_MODE", "false").lower() == "true" or NETWORK == "mock"

# ─── RPC endpoints (values are NOT printed or logged) ────────────────────────
ARBITRUM_SEPOLIA_RPC_URL = os.getenv("ARBITRUM_SEPOLIA_RPC_URL")
ARBITRUM_ONE_RPC_URL = os.getenv("ARBITRUM_ONE_RPC_URL")

# Select the appropriate RPC for the configured network
if NETWORK == "arbitrum_one":
    RPC_URL = ARBITRUM_ONE_RPC_URL
elif NETWORK == "arbitrum_sepolia":
    RPC_URL = ARBITRUM_SEPOLIA_RPC_URL
else:
    RPC_URL = None  # mock mode — no RPC needed

PRIVATE_KEY = os.getenv("PRIVATE_KEY")

# ─── Contract addresses (populated after deployment) ─────────────────────────
GATE_ADDRESS = os.getenv("AGENT_EXECUTION_GATE_ADDRESS")
VAULT_ADDRESS = os.getenv("TBILL_VAULT_ADDRESS")
MANDATE_REGISTRY_ADDRESS = os.getenv("AGENT_MANDATE_REGISTRY_ADDRESS")
MANDATE_ID = os.getenv("MANDATE_ID")
ORACLE_ADDRESS = os.getenv("RWA_STATE_ORACLE_ADDRESS")
COMPLIANCE_REGISTRY_ADDRESS = os.getenv("COMPLIANCE_REGISTRY_ADDRESS")
ASSET_REGISTRY_ADDRESS = os.getenv("RWA_ASSET_REGISTRY_ADDRESS")

# ─── Settlement asset addresses ───────────────────────────────────────────────
# Arbitrum One: Native Circle USDC (6 decimals) — real canonical address
ARBITRUM_ONE_NATIVE_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"

# Arbitrum Sepolia: test token deployed by the project deployment script
ARBITRUM_SEPOLIA_TEST_TOKEN = os.getenv("TEST_TOKEN_ADDRESS")

if NETWORK == "arbitrum_one":
    # Production: only real USDC; never fall back to a testnet address
    SETTLEMENT_ASSET_ADDRESS = os.getenv("SETTLEMENT_ASSET_ADDRESS", ARBITRUM_ONE_NATIVE_USDC)
elif NETWORK == "arbitrum_sepolia":
    # Testnet: use the test token; if missing, warn at startup (do not raise — testnet is lenient)
    SETTLEMENT_ASSET_ADDRESS = os.getenv("SETTLEMENT_ASSET_ADDRESS", ARBITRUM_SEPOLIA_TEST_TOKEN)
else:
    SETTLEMENT_ASSET_ADDRESS = os.getenv("SETTLEMENT_ASSET_ADDRESS")

ASSET_ADDRESS = os.getenv("RWA_ASSET_ADDRESS", SETTLEMENT_ASSET_ADDRESS)

# ─── Production data provider & attestation credentials ──────────────────────
# Canonical Arbitrum One Tokenized Treasury addresses
ARBITRUM_ONE_OPENEDEN_TBILL = "0xF84D28A8D28292842dD73D1c5F99476A80b6666A"
ARBITRUM_ONE_TBILL_ORACLE = "0xc0952c8ba068c887B675B4182F3A65420D045F46"
ARBITRUM_ONE_ONDO_USDY = "0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D"

# On-chain Chainlink / OpenEden AggregatorV3 price feed address (e.g. 0xc095... on Arbitrum One)
RWA_PRICE_FEED_ADDRESS = os.getenv("RWA_PRICE_FEED_ADDRESS")

# Federal Reserve Economic Data (FRED) API key for live US Treasury yields (DTB4WK series)
FRED_API_KEY = os.getenv("FRED_API_KEY")

# EXTERNAL_DEPENDENCY: configure RWA_DATA_PROVIDER_URL with a real institutional feed.
RWA_DATA_PROVIDER_URL = os.getenv("RWA_DATA_PROVIDER_URL")
RWA_PROVIDER_API_KEY = os.getenv("RWA_PROVIDER_API_KEY")
# EXTERNAL_DEPENDENCY: ORACLE_ATTESTATION_SIGNER_KEY must be a key whose address is
# registered on-chain via RWAStateOracle.setApprovedProvider(). Never commit this key.
ORACLE_ATTESTATION_SIGNER_KEY = os.getenv("ORACLE_ATTESTATION_SIGNER_KEY")

# ─── Institutional custody & settlement configuration ─────────────────────────
# EXTERNAL_DEPENDENCY: configure CUSTODIAN_API_URL with a real custody provider.
CUSTODIAN_API_URL = os.getenv("CUSTODIAN_API_URL")
CUSTODIAN_CLIENT_ID = os.getenv("CUSTODIAN_CLIENT_ID")

# ─── Configurable thresholds — names only are exposed to the user ─────────────
YIELD_THRESHOLD = float(os.getenv("YIELD_THRESHOLD", "5.0"))   # percent
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "60"))          # seconds

# Test-only configured yield used strictly during unit tests (when MOCK_MODE is active).
# Live agent execution NEVER uses this value — it strictly requires real live FRED market
# data (DTB4WK series) and fails closed if FRED_API_KEY or the network feed is unavailable.
CURRENT_YIELD = float(os.getenv("CURRENT_YIELD", "6.5"))       # percent (test-only)

# ─── Startup validation ───────────────────────────────────────────────────────
if not MOCK_MODE:
    missing = []
    if not RPC_URL:
        missing.append(f"{NETWORK.upper()}_RPC_URL")
    if not PRIVATE_KEY:
        missing.append("PRIVATE_KEY")

    if missing:
        raise EnvironmentError(
            f"Missing required credentials for network '{NETWORK}': "
            f"{', '.join(missing)}. Set these in your .env file."
        )

    # Additional production-only mandatory checks
    if NETWORK == "arbitrum_one":
        prod_missing = []
        if not GATE_ADDRESS:
            prod_missing.append("AGENT_EXECUTION_GATE_ADDRESS")
        if not VAULT_ADDRESS:
            prod_missing.append("TBILL_VAULT_ADDRESS")
        if not MANDATE_REGISTRY_ADDRESS:
            prod_missing.append("AGENT_MANDATE_REGISTRY_ADDRESS")
        if not ORACLE_ADDRESS:
            prod_missing.append("RWA_STATE_ORACLE_ADDRESS")
        if prod_missing:
            raise EnvironmentError(
                f"Missing required Arbitrum One production contract addresses: "
                f"{', '.join(prod_missing)}. These must be set after deploying to mainnet."
            )
