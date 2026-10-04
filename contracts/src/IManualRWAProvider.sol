// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IManualRWAProvider {
    function nav() external view returns (uint256);
    function navUpdatedAt() external view returns (uint256);
    function redemptionOpen() external view returns (bool);
    function liquidityTier() external view returns (uint8);
    function riskTier() external view returns (uint8);
    function supported() external view returns (bool);
    function maxNavAge() external view returns (uint256);
}
