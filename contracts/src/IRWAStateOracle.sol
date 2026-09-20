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
        uint8 liquidityTier
    );

    event AssetSupported(address indexed asset, uint256 maxNavAge);
    event AssetRemoved(address indexed asset);
    event RedemptionStatusChanged(address indexed asset, bool open);

    // -------------------------------------------------------
    // Errors
    // -------------------------------------------------------

    error AssetNotSupported();
    error NavStale();
    error RedemptionClosed();
    error LiquidityTooLow();

    // -------------------------------------------------------
    // Asset state struct
    // -------------------------------------------------------

    struct AssetState {
        uint256 nav;            // Net asset value (18 decimals)
        uint256 navUpdatedAt;   // Timestamp of last NAV update
        bool    redemptionOpen; // Whether redemptions are currently accepted
        uint8   liquidityTier;  // 0 = illiquid, 1 = low, 2 = medium, 3 = high
        bool    supported;      // True if asset is known to the oracle
        uint256 maxNavAge;      // Maximum acceptable NAV staleness (seconds)
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

    function nav(address asset) external view returns (uint256);

    function isNavFresh(address asset) external view returns (bool);

    function isRedemptionOpen(address asset) external view returns (bool);

    // -------------------------------------------------------
    // Admin / simulation write functions
    // -------------------------------------------------------

    /// @notice Register a new asset with the oracle.
    function addAsset(address asset, uint256 maxNavAge) external;

    /// @notice Remove an asset from the oracle.
    function removeAsset(address asset) external;

    /// @notice Update simulated NAV and redemption status.
    function updateAssetState(
        address asset,
        uint256 newNav,
        bool redemptionOpen,
        uint8 liquidityTier
    ) external;

    /// @notice Toggle redemption status independently.
    function setRedemptionOpen(address asset, bool open) external;
}
