// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IRWAStateOracle} from "./IRWAStateOracle.sol";
import {IManualRWAProvider} from "./IManualRWAProvider.sol";
import {Actions, ActionMask} from "./Types.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
// Import manual provider only once

// ============================================================
//  RWAStateOracle.sol — Production & Attestation Hardened
//
//  Authoritative on-chain RWA state oracle providing:
//   - Action-specific eligibility checks: isEligible(asset, action)
//   - NAV tracking and time-window staleness enforcement
//   - Redemption window open/closed status
//   - Liquidity tier tracking and threshold validation
//   - Approved institutional data provider role & attestation verification
//   - EIP-712 cryptographic attestation updates
// ============================================================

contract RWAStateOracle is IRWAStateOracle, EIP712, Ownable {
    using ECDSA for bytes32;

    // -------------------------------------------------------
    // State Variables
    // -------------------------------------------------------

    /// @dev Typehash for EIP-712 RWA attestation
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "RWAAttestation(address asset,uint256 nav,uint256 navTimestamp,bool redemptionOpen,uint8 liquidityTier,uint256 nonce,uint256 deadline)"
    );

    /// @dev Minimum liquidity tier required for Actions.ALLOCATE (default: 1).
    /// Tier 0 = illiquid, 1 = low, 2 = medium, 3 = high.
    uint8 public minLiquidityTier = 1;

    /// @dev Mapping from asset address to its current state.
    mapping(address => AssetState) private _assetStates;

    /// @dev Mapping of approved data providers / oracle signers.
    mapping(address => bool) public override isApprovedProvider;

    /// @dev Anti-replay protection for submitted attestations.
    mapping(bytes32 => bool) public executedAttestations;

    /// @dev Mapping from asset address to its configured Chainlink/OpenEden AggregatorV3Interface feed.
    mapping(address => address) private _assetPriceFeeds;

    // -------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------

    modifier onlyAuthorizedUpdater() {
        if (msg.sender != owner() && !isApprovedProvider[msg.sender]) {
            revert UnauthorizedProvider();
        }
        _;
    }

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /// @param initialOwner Address of the contract owner (admin/governance).
    constructor(address initialOwner)
        EIP712("TBillFlow-RWA-Oracle", "1")
        Ownable(initialOwner)
    {
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
        IManualRWAProvider provider = _manualProviders[asset];
        if (address(provider) != address(0)) {
            AssetState memory state;
            state.nav = provider.nav();
            state.navUpdatedAt = provider.navUpdatedAt();
            state.redemptionOpen = provider.redemptionOpen();
            state.liquidityTier = provider.liquidityTier();
            state.riskTier = provider.riskTier();
            state.supported = provider.supported();
            state.maxNavAge = provider.maxNavAge();
            return state;
        }
        return _assetStates[asset];
    }
    /// @inheritdoc IRWAStateOracle
    function getRiskTier(address asset) external view returns (uint8) {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }
        return state.riskTier;
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
        uint256 _now = block.timestamp;
        // forge-lint: disable-next-line(block-timestamp)
        if (_now < state.navUpdatedAt) {
            return false;
        }
        // forge-lint: disable-next-line(block-timestamp)
        return (_now - state.navUpdatedAt <= state.maxNavAge);
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
    function setApprovedProvider(address provider, bool approved) external onlyOwner {
        require(provider != address(0), "zero provider address");
        // forge-lint: disable-next-line(missing-events-access-control)
        isApprovedProvider[provider] = approved;
        emit ProviderUpdated(provider, approved);
    }

    /// @inheritdoc IRWAStateOracle
    function updateAssetState(
        address asset,
        uint256 newNav,
        bool redemptionOpen,
        uint8 liquidityTier
    ) external onlyAuthorizedUpdater {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }

        uint256 currentTimestamp = block.timestamp;
        state.nav = newNav;
        state.navUpdatedAt = currentTimestamp;
        state.redemptionOpen = redemptionOpen;
        state.liquidityTier = liquidityTier;
        // riskTier remains unchanged
        emit AssetStateUpdated(
            asset,
            newNav,
            currentTimestamp,
            redemptionOpen,
            liquidityTier,
            state.riskTier
        );


    }

    /// @inheritdoc IRWAStateOracle
    function updateAssetStateWithAttestation(
            RWAAttestation calldata attestation,
            bytes calldata signature
        ) external {
            uint256 currentTimestamp = block.timestamp;
        // forge-lint: disable-next-line(block-timestamp)
        if (currentTimestamp > attestation.deadline) {
            revert InvalidAttestationDeadline();
        }
        // forge-lint: disable-next-line(block-timestamp)
        if (attestation.navTimestamp > currentTimestamp) {
            revert FutureAttestationTimestamp();
        }

        bytes32 attestationHash = keccak256(
            abi.encodePacked(attestation.asset, attestation.nonce)
        );
        if (executedAttestations[attestationHash]) {
            revert AttestationAlreadyUsed();
        }

        AssetState storage state = _assetStates[attestation.asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }
        if (attestation.navTimestamp <= state.navUpdatedAt) {
            revert StaleAttestationTimestamp();
        }

        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                attestation.asset,
                attestation.nav,
                attestation.navTimestamp,
                attestation.redemptionOpen,
                attestation.liquidityTier,
                attestation.nonce,
                attestation.deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        if (!isApprovedProvider[signer]) {
            revert UnauthorizedProvider();
        }

        executedAttestations[attestationHash] = true;

        state.nav = attestation.nav;
        state.navUpdatedAt = attestation.navTimestamp;
        state.redemptionOpen = attestation.redemptionOpen;
        state.liquidityTier = attestation.liquidityTier;

        // forge-lint: disable-next-line(reentrancy-events)
        emit AssetStateUpdated(attestation.asset, attestation.nav, attestation.navTimestamp, attestation.redemptionOpen, attestation.liquidityTier, state.riskTier);

        // forge-lint: disable-next-line(reentrancy-events)
        emit AttestationProcessed(attestationHash, signer, attestation.asset);
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
    /// @notice Update risk tier for an asset
    function setRiskTier(address asset, uint8 newRiskTier) external onlyAuthorizedUpdater {
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }
        state.riskTier = newRiskTier;
        emit AssetStateUpdated(asset, state.nav, state.navUpdatedAt, state.redemptionOpen, state.liquidityTier, newRiskTier);
    }

    /// @inheritdoc IRWAStateOracle
    function getAssetFeed(address asset) external view returns (address) {
        return _assetPriceFeeds[asset];
    }

    /// @inheritdoc IRWAStateOracle
    function setAssetFeed(address asset, address feed) external onlyOwner {
        require(asset != address(0), "zero asset address");
        if (!_assetStates[asset].supported) {
            revert AssetNotSupported();
        }
        _assetPriceFeeds[asset] = feed;
        emit AssetFeedConfigured(asset, feed);
    }

    // Manual provider support
    mapping(address => IManualRWAProvider) private _manualProviders;

    function setManualProvider(address asset, address provider) external onlyOwner {
        require(_assetStates[asset].supported, "Asset not supported");
        _manualProviders[asset] = IManualRWAProvider(provider);
    }

    function getManualProvider(address asset) external view returns (address) {
        return address(_manualProviders[asset]);
    }

    /// @inheritdoc IRWAStateOracle
    function syncFromFeed(address asset) external {
        address feed = _assetPriceFeeds[asset];
        if (feed == address(0)) {
            revert NoFeedConfigured();
        }
        AssetState storage state = _assetStates[asset];
        if (!state.supported) {
            revert AssetNotSupported();
        }

        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = AggregatorV3Interface(feed).latestRoundData();
        startedAt;

        if (answer <= 0) {
            revert InvalidOraclePrice();
        }
        if (updatedAt == 0) {
            revert InvalidOracleTimestamp();
        }
        uint256 currentTimestamp = block.timestamp;
        // forge-lint: disable-next-line(block-timestamp)
        if (updatedAt > currentTimestamp) {
            revert FutureAttestationTimestamp();
        }
        if (answeredInRound < roundId) {
            revert StaleAttestationTimestamp();
        }

        uint8 feedDecimals = AggregatorV3Interface(feed).decimals();
        uint256 normalizedNav;
        if (feedDecimals <= 18) {
            // forge-lint: disable-next-line(unsafe-typecast)
            normalizedNav = uint256(answer) * (10 ** (18 - feedDecimals));
        } else {
            // forge-lint: disable-next-line(unsafe-typecast)
            normalizedNav = uint256(answer) / (10 ** (feedDecimals - 18));
        }

        state.nav = normalizedNav;
        state.navUpdatedAt = updatedAt;

        emit AssetStateUpdated(
            asset,
            normalizedNav,
            updatedAt,
            state.redemptionOpen,
            state.liquidityTier,
            state.riskTier
        );
        emit FeedSynchronized(asset, feed, normalizedNav, updatedAt);
    }
}
