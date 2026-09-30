// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ============================================================
//  RWAAssetRegistry.sol
//
//  Registry linking real settlement assets (e.g. Circle Native USDC
//  on Arbitrum One) with institutional Tokenized Treasury assets
//  (e.g. Ondo USDY, Securitize BUIDL, Superstate USTB).
// ============================================================

contract RWAAssetRegistry is Ownable {

    struct AssetMetadata {
        address settlementToken;     // e.g. Native USDC (6 decimals)
        address tokenizedRwaToken;   // e.g. USDY / BUIDL
        uint8   settlementDecimals;  // e.g. 6
        uint8   rwaDecimals;         // e.g. 18
        uint256 minSubscription;     // Minimum order size in settlement units
        bool    active;              // Trading enabled
        string  custodianName;       // e.g. "BNY Mellon", "Coinbase Prime"
    }

    mapping(address => AssetMetadata) private _assets;
    address[] private _supportedAssets;

    event AssetConfigured(
        address indexed rwaToken,
        address indexed settlementToken,
        uint256 minSubscription,
        string custodian
    );

    constructor(address initialOwner) Ownable(initialOwner) {
        require(initialOwner != address(0), "zero owner");
    }

    function configureAsset(
        address rwaToken,
        address settlementToken,
        uint8 settlementDecimals,
        uint8 rwaDecimals,
        uint256 minSubscription,
        bool active,
        string calldata custodianName
    ) external onlyOwner {
        require(rwaToken != address(0), "zero rwaToken");
        require(settlementToken != address(0), "zero settlementToken");

        if (!_assets[rwaToken].active && _assets[rwaToken].settlementToken == address(0)) {
            _supportedAssets.push(rwaToken);
        }

        _assets[rwaToken] = AssetMetadata({
            settlementToken: settlementToken,
            tokenizedRwaToken: rwaToken,
            settlementDecimals: settlementDecimals,
            rwaDecimals: rwaDecimals,
            minSubscription: minSubscription,
            active: active,
            custodianName: custodianName
        });

        emit AssetConfigured(rwaToken, settlementToken, minSubscription, custodianName);
    }

    function getAsset(address rwaToken) external view returns (AssetMetadata memory) {
        return _assets[rwaToken];
    }

    function isAssetActive(address rwaToken) external view returns (bool) {
        return _assets[rwaToken].active;
    }

    function getSupportedAssets() external view returns (address[] memory) {
        return _supportedAssets;
    }
}
