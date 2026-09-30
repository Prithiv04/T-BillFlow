// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ============================================================
//  ITokenizedRWA.sol
//
//  Standardized interface for tokenized real-world assets (e.g.
//  Ondo USDY, Securitize BUIDL, Superstate USTB, Backed IB01).
//  Encapsulates token decimals, underlying asset, and permissioning.
// ============================================================

interface ITokenizedRWA is IERC20 {
    /// @notice Returns the settlement currency (e.g. USDC).
    function underlyingAsset() external view returns (address);

    /// @notice NAV per share in 18 decimals.
    function currentNav() external view returns (uint256);

    /// @notice Check if a recipient wallet can hold or receive this asset.
    function canReceive(address recipient) external view returns (bool);

    /// @notice Minimum subscription or redemption unit in underlying decimals.
    function minimumUnit() external view returns (uint256);
}
