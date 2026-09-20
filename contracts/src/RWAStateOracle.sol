// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRWAStateOracle} from "./IRWAStateOracle.sol";
import {Actions, ActionMask} from "./Types.sol";

// ============================================================
//  RWAStateOracle.sol — Phase 2 Implementation
//
//  A simulated/hackathon RWA state oracle providing:
//   - Action-specific eligibility checks: isEligible(asset, action)
//   - NAV tracking and time-window staleness enforcement
//   - Redemption window open/closed status
//   - Liquidity tier tracking and threshold validation
//   - Controlled administrative simulation functions
// ============================================================

contract RWAStateOracle is IRWAStateOracle, Ownable {
    // -------------------------------------------------------
    // State Variables
    // -------------------------------------------------------

    /// @dev Minimum liquidity tier required for Actions.ALLOCATE (default: 1).
    /// Tier 0 = illiquid, 1 = low, 2 = medium, 3 = high.
    uint8 public minLiquidityTier = 1;

    /// @dev Mapping from asset address to its current state.
    mapping(address => AssetState) private _assetStates;

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /// @param initialOwner Address of the contract owner (admin/simulator).
    constructor(address initialOwner) Ownable(initialOwner) {
        require(initialOwner != address(0), "zero initial owner");
    }

    // -------------------------------------------------------
    // Core Eligibility Check (Action-Specific)
    // -------------------------------------------------------

    /// @inheritdoc IRWAStateOracle
    /// @dev Validation flow:
    ///      1. Asset must be supported. Reverts with AssetNotSupported().
    ///      2. NAV must be fresh. Reverts with NavStale().
    ///      3. For REDEEM / WITHDRAW: redemption must be open. Reverts with RedemptionClosed().
    ///      4. For ALLOCATE: liquidityTier >= minLiquidityTier. Reverts with LiquidityTooLow().
    ///      5. Returns true if all applicable requirements are met.
    function isEligible(address asset, uint256 action) external view returns (bool) {
        AssetState storage state = _assetStates[asset];

        // 1. Asset support check
        if (!state.supported) {
            revert AssetNotSupported();
        }

        // 2. NAV freshness check
        if (!isNavFresh(asset)) {
            revert NavStale();
        }

        // 3. Action-specific: REDEEM / WITHDRAW requires redemptionOpen
        if (
            ActionMask.isAllowed(action, Actions.REDEEM) ||
            ActionMask.isAllowed(action, Actions.WITHDRAW)
        ) {
            if (!state.redemptionOpen) {
                revert RedemptionClosed();
            }
        }

        // 4. Action-specific: ALLOCATE requires sufficient liquidity tier
        if (ActionMask.isAllowed(action, Actions.ALLOCATE)) {
            if (state.liquidityTier < minLiquidityTier) {
                revert LiquidityTooLow();
            }
        }

        return true;
    }

    // -------------------------------------------------------
    // State Read Functions
    // -------------------------------------------------------

    /// @inheritdoc IRWAStateOracle
    function getAssetState(address asset) external view returns (AssetState memory) {
        return _assetStates[asset];
    }

    /// @inheritdoc IRWAStateOracle
    function nav(address asset) external view returns (uint256) {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }
        return state.nav;
    }

    /// @inheritdoc IRWAStateOracle
    function isNavFresh(address asset) public view returns (bool) {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            return false;
        }
        if (state.navUpdatedAt == 0) {
            return false;
        }
        if (block.timestamp < state.navUpdatedAt) {
            return false;
        }
        return (block.timestamp - state.navUpdatedAt <= state.maxNavAge);
    }

    /// @inheritdoc IRWAStateOracle
    function isRedemptionOpen(address asset) public view returns (bool) {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            return false;
        }
        return state.redemptionOpen;
    }

    // -------------------------------------------------------
    // Admin / Simulation Write Functions
    // -------------------------------------------------------

    /// @inheritdoc IRWAStateOracle
    function addAsset(address asset, uint256 maxNavAge) external onlyOwner {
        require(asset != address(0), "zero asset address");
        require(maxNavAge > 0, "zero maxNavAge");

        AssetState storage state = _assetStates[asset];
        state.supported = true;
        state.maxNavAge = maxNavAge;

        emit AssetSupported(asset, maxNavAge);
    }

    /// @inheritdoc IRWAStateOracle
    function removeAsset(address asset) external onlyOwner {
        if (!_assetStates[asset].supported) {
            revert AssetNotSupported();
        }

        _assetStates[asset].supported = false;
        emit AssetRemoved(asset);
    }

    /// @inheritdoc IRWAStateOracle
    function updateAssetState(
        address asset,
        uint256 newNav,
        bool redemptionOpen,
        uint8 liquidityTier
    ) external onlyOwner {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }

        state.nav = newNav;
        state.navUpdatedAt = block.timestamp;
        state.redemptionOpen = redemptionOpen;
        state.liquidityTier = liquidityTier;

        emit AssetStateUpdated(
            asset,
            newNav,
            block.timestamp,
            redemptionOpen,
            liquidityTier
        );
    }

    /// @inheritdoc IRWAStateOracle
    function setRedemptionOpen(address asset, bool open) external onlyOwner {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }

        state.redemptionOpen = open;
        emit RedemptionStatusChanged(asset, open);
    }

    /// @notice Update minimum liquidity tier threshold for ALLOCATE actions.
    function setMinLiquidityTier(uint8 newMinTier) external onlyOwner {
        minLiquidityTier = newMinTier;
    }

    /// @notice Update maximum acceptable NAV age for a supported asset.
    function setMaxNavAge(address asset, uint256 newMaxNavAge) external onlyOwner {
        require(newMaxNavAge > 0, "zero maxNavAge");
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }
        state.maxNavAge = newMaxNavAge;
        emit AssetSupported(asset, newMaxNavAge);
    }
}
