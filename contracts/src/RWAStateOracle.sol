// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IRWAStateOracle} from "./IRWAStateOracle.sol";
import {Actions, ActionMask} from "./Types.sol";

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
    function setApprovedProvider(address provider, bool approved) external onlyOwner {
        require(provider != address(0), "zero provider address");
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
    function updateAssetStateWithAttestation(
        RWAAttestation calldata attestation,
        bytes calldata signature
    ) external {
        if (block.timestamp > attestation.deadline) {
            revert InvalidAttestationDeadline();
        }
        if (attestation.navTimestamp > block.timestamp) {
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

        emit AssetStateUpdated(
            attestation.asset,
            attestation.nav,
            attestation.navTimestamp,
            attestation.redemptionOpen,
            attestation.liquidityTier
        );

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
}
