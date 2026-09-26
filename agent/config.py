# Configuration for the off‑chain T‑BillFlow agent
import os
from dotenv import load_dotenv

# Load .env from the project root (the .env file lives alongside the repo root)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

# Environment variable names (values are NOT printed or logged)
ARBITRUM_SEPOLIA_RPC_URL = os.getenv("ARBITRUM_SEPOLIA_RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

# Contract addresses (must be set after deployment)
GATE_ADDRESS = os.getenv("AGENT_EXECUTION_GATE_ADDRESS")
VAULT_ADDRESS = os.getenv("TBILL_VAULT_ADDRESS")
MANDATE_REGISTRY_ADDRESS = os.getenv("AGENT_MANDATE_REGISTRY_ADDRESS")
MANDATE_ID = os.getenv("MANDATE_ID")
ORACLE_ADDRESS = os.getenv("RWA_STATE_ORACLE_ADDRESS")
ASSET_ADDRESS = os.getenv("RWA_ASSET_ADDRESS")  # asset id for oracle eligibility

# Configurable thresholds – **names only** are exposed to the user
YIELD_THRESHOLD = float(os.getenv("YIELD_THRESHOLD", "5.0"))  # percent
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "60"))        # seconds

# Synthetic opportunity yield (used for the hackathon demo)
CURRENT_YIELD = float(os.getenv("CURRENT_YIELD", "6.5"))   # percent

# Mock / dry‑run mode flag
MOCK_MODE = os.getenv("AGENT_MOCK_MODE", "false").lower() == "true"

# Validate required secrets are present (raise early if missing)
if not ARBITRUM_SEPOLIA_RPC_URL or not PRIVATE_KEY:
    raise EnvironmentError("Missing blockchain credentials in .env")
