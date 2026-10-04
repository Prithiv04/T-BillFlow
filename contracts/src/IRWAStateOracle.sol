// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Types.sol";

// ============================================================
//  IRWAStateOracle.sol  —  Authoritative interface
//
//  RWAStateOracle.sol MUST implement this interface exactly.
// ============================================================

interface IRWAStateOracle {

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event AssetStateUpdated(
        address indexed asset,
        uint256 nav,
        uint256 navUpdatedAt,
        bool redemptionOpen,
        uint8 liquidityTier,
        uint8 riskTier
    );

    event AssetSupported(address indexed asset, uint256 maxNavAge);
    event AssetRemoved(address indexed asset);
    event RedemptionStatusChanged(address indexed asset, bool open);
    event ProviderUpdated(address indexed provider, bool approved);
    event AttestationProcessed(bytes32 indexed attestationHash, address indexed provider, address indexed asset);
    event AssetFeedConfigured(address indexed asset, address indexed feed);
    event FeedSynchronized(address indexed asset, address indexed feed, uint256 nav, uint256 updatedAt);

    // -------------------------------------------------------
    // Errors
    // -------------------------------------------------------

    error AssetNotSupported();
    error NavStale();
    error RedemptionClosed();
    error LiquidityTooLow();
    error UnauthorizedProvider();
    error InvalidAttestationDeadline();
    error FutureAttestationTimestamp();
    error StaleAttestationTimestamp();
    error AttestationAlreadyUsed();
    error InvalidAttestationSignature();
    error NoFeedConfigured();
    error InvalidOraclePrice();
    error InvalidOracleTimestamp();

    // -------------------------------------------------------
    // Asset state struct & Attestation struct
    // -------------------------------------------------------

    struct AssetState {
        uint256 nav;            // Net asset value (18 decimals)
        uint256 navUpdatedAt;   // Timestamp of last NAV update
        bool    redemptionOpen; // Whether redemptions are currently accepted
        uint8   liquidityTier;  // 0 = illiquid, 1 = low, 2 = medium, 3 = high
        uint8   riskTier;       // Risk tier classification
        bool    supported;      // True if asset is known to the oracle
        uint256 maxNavAge;      // Maximum acceptable NAV staleness (seconds)
    }

    struct RWAAttestation {
        address asset;
        uint256 nav;
        uint256 navTimestamp;
        bool    redemptionOpen;
        uint8   liquidityTier;
        uint256 nonce;
        uint256 deadline;
    }

    // -------------------------------------------------------
    // Core eligibility check (action-specific)
    // -------------------------------------------------------

    /// @notice Returns true if `asset` is eligible for `action`.
    ///         DEPOSIT:  supported + NAV fresh
    ///         REDEEM:   supported + NAV fresh + redemptionOpen
    ///         ALLOCATE: supported + NAV fresh + liquidityTier >= minimum
    ///         Reverts with typed error if ineligible.
    function isEligible(address asset, uint256 action) external view returns (bool);

    // -------------------------------------------------------
    // State read functions
    // -------------------------------------------------------

    function getAssetState(address asset) external view returns (AssetState memory);
    function getRiskTier(address asset) external view returns (uint8);

    function nav(address asset) external view returns (uint256);

    function isNavFresh(address asset) external view returns (bool);

    function isRedemptionOpen(address asset) external view returns (bool);

    function isApprovedProvider(address provider) external view returns (bool);

    /// @notice Get the on-chain price feed configured for `asset`.
    function getAssetFeed(address asset) external view returns (address);

    // -------------------------------------------------------
    // Admin / simulation write functions
    // -------------------------------------------------------

    /// @notice Register a new asset with the oracle.
    function addAsset(address asset, uint256 maxNavAge) external;

    /// @notice Remove an asset from the oracle.
    function removeAsset(address asset) external;

    /// @notice Bind an asset to an authoritative on-chain price feed (e.g. Chainlink / OpenEden aggregator).
    function setAssetFeed(address asset, address feed) external;

    /// @notice Pull latest round data from the configured on-chain feed and update NAV.
    function syncFromFeed(address asset) external;

    /// @notice Update simulated NAV and redemption status.
    function updateAssetState(
        address asset,
        uint256 newNav,
        bool redemptionOpen,
        uint8 liquidityTier
    ) external;

    /// @notice Toggle redemption status independently.
    function setRedemptionOpen(address asset, bool open) external;

    /// @notice Authorize or revoke an approved data provider.
    function setApprovedProvider(address provider, bool approved) external;

    /// @notice Update asset state via a cryptographically signed EIP-712 attestation from an approved provider.
    function updateAssetStateWithAttestation(
        RWAAttestation calldata attestation,
        bytes calldata signature
    ) external;
}
