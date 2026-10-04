// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IManualRWAProvider} from "./IManualRWAProvider.sol";

/**
 * @title ManualRWAProvider
 * @dev Simple owner‑controlled contract that stores RWA state values on‑chain.
 *      Used as an alternative to price feed aggregators for assets where an
 *      off‑chain trusted party can update the state.
 */
contract ManualRWAProvider is IManualRWAProvider, Ownable {
    uint256 private _nav;
    uint256 private _navUpdatedAt;
    bool private _redemptionOpen;
    uint8 private _liquidityTier;
    uint8 private _riskTier;
    bool private _supported;
    uint256 private _maxNavAge;

    constructor(address initialOwner) Ownable(initialOwner) {}

    // Owner can set all values at once
    function setState(
        uint256 nav_,
        uint256 navUpdatedAt_,
        bool redemptionOpen_,
        uint8 liquidityTier_,
        uint8 riskTier_,
        bool supported_,
        uint256 maxNavAge_
    ) external onlyOwner {
        _nav = nav_;
        _navUpdatedAt = navUpdatedAt_;
        _redemptionOpen = redemptionOpen_;
        _liquidityTier = liquidityTier_;
        _riskTier = riskTier_;
        _supported = supported_;
        _maxNavAge = maxNavAge_;
    }

    // Individual setters for flexibility
    function setNav(uint256 nav_) external onlyOwner { _nav = nav_; }
    function setNavUpdatedAt(uint256 ts) external onlyOwner { _navUpdatedAt = ts; }
    function setRedemptionOpen(bool open) external onlyOwner { _redemptionOpen = open; }
    function setLiquidityTier(uint8 tier) external onlyOwner { _liquidityTier = tier; }
    function setRiskTier(uint8 tier) external onlyOwner { _riskTier = tier; }
    function setSupported(bool sup) external onlyOwner { _supported = sup; }
    function setMaxNavAge(uint256 age) external onlyOwner { _maxNavAge = age; }

    // View functions implementing the interface
    function nav() external view override returns (uint256) { return _nav; }
    function navUpdatedAt() external view override returns (uint256) { return _navUpdatedAt; }
    function redemptionOpen() external view override returns (bool) { return _redemptionOpen; }
    function liquidityTier() external view override returns (uint8) { return _liquidityTier; }
    function riskTier() external view override returns (uint8) { return _riskTier; }
    function supported() external view override returns (bool) { return _supported; }
    function maxNavAge() external view override returns (uint256) { return _maxNavAge; }
}
