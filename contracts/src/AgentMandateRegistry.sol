// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./Types.sol";
import "./IAgentMandateRegistry.sol";

// ============================================================
//  AgentMandateRegistry.sol
//
//  Stores and validates agent mandates for T-BillFlow 2.0.
//
//  The mandate owner (human / DAO / multisig) grants a bounded
//  authority to an off-chain agent.  The AgentExecutionGate
//  calls validateMandate() and recordUsage() during execution.
//
//  Key security properties
//  ─────────────────────────────────────────────────────────
//  • EIP-712 typed-data signatures prevent replay across
//    chains and contracts.
//  • Per-owner nonces prevent intra-chain replay.
//  • maxTx and maxCumulative hard-cap the agent's budget.
//  • Revocation is instant and irrevocable.
//  • Only the registered executionGate may call recordUsage().
// ============================================================

contract AgentMandateRegistry is IAgentMandateRegistry, EIP712, Ownable {
    using ECDSA for bytes32;

    // -------------------------------------------------------
    // EIP-712 typehash
    // -------------------------------------------------------

    /// @dev keccak256 of the canonical GrantMandate struct type string.
    bytes32 public constant GRANT_MANDATE_TYPEHASH = keccak256(
        "GrantMandate("
        "address agent,"
        "address asset,"
        "address allowedTarget,"
        "uint256 allowedActionsMask,"
        "uint256 maxTx,"
        "uint256 maxCumulative,"
        "uint256 validFrom,"
        "uint256 validUntil,"
        "uint256 ownerNonce"
        ")"
    );

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @notice The AgentExecutionGate contract that may call recordUsage().
    address public executionGate;

    /// @notice Mandate storage keyed by mandateId.
    mapping(bytes32 => Mandate) private _mandates;

    /// @notice Owner of each mandate (the signer of the EIP-712 message).
    mapping(bytes32 => address) private _mandateOwner;

    /// @notice Per-owner nonce for replay protection.
    mapping(address => uint256) private _ownerNonce;

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    constructor(address _owner)
        EIP712("AgentMandateRegistry", "1")
        Ownable(_owner)
    {}

    // -------------------------------------------------------
    // Admin: register the execution gate
    // -------------------------------------------------------

    /// @notice Set the ExecutionGate address. Only callable by the registry owner.
    ///         May be called once after deployment.
    function setExecutionGate(address gate) external onlyOwner {
        require(gate != address(0), "zero gate");
        executionGate = gate;
    }

    // -------------------------------------------------------
    // IAgentMandateRegistry — grantMandate
    // -------------------------------------------------------

    /// @inheritdoc IAgentMandateRegistry
    function grantMandate(
        address agent,
        address asset,
        address allowedTarget,
        uint256 allowedActionsMask,
        uint256 maxTx,
        uint256 maxCumulative,
        uint256 validFrom,
        uint256 validUntil,
        uint256 ownerNonce_,
        bytes calldata signature
    ) external returns (bytes32 mandateId) {
        // ── Basic parameter sanity ──────────────────────────
        if (
            agent == address(0) ||
            asset == address(0) ||
            allowedTarget == address(0) ||
            allowedActionsMask == 0 ||
            maxTx == 0 ||
            maxCumulative == 0 ||
            validUntil <= validFrom ||
            validUntil <= block.timestamp
        ) revert InvalidMandateParams();

        // ── EIP-712 signature verification ──────────────────
        bytes32 structHash = keccak256(abi.encode(
            GRANT_MANDATE_TYPEHASH,
            agent,
            asset,
            allowedTarget,
            allowedActionsMask,
            maxTx,
            maxCumulative,
            validFrom,
            validUntil,
            ownerNonce_
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        // ── Nonce replay protection ──────────────────────────
        if (_ownerNonce[signer] != ownerNonce_) revert InvalidSignature();
        unchecked { _ownerNonce[signer]++; }

        // ── Derive deterministic mandate ID ─────────────────
        mandateId = keccak256(abi.encode(
            signer,
            agent,
            asset,
            allowedTarget,
            allowedActionsMask,
            validFrom,
            validUntil,
            ownerNonce_
        ));

        // ── Store mandate ────────────────────────────────────
        _mandates[mandateId] = Mandate({
            agent: agent,
            asset: asset,
            allowedTarget: allowedTarget,
            allowedActionsMask: allowedActionsMask,
            maxTx: maxTx,
            maxCumulative: maxCumulative,
            used: 0,
            validFrom: validFrom,
            validUntil: validUntil,
            nonce: ownerNonce_,
            revoked: false
        });
        _mandateOwner[mandateId] = signer;

        emit MandateGranted(
            mandateId,
            signer,
            agent,
            asset,
            allowedTarget,
            allowedActionsMask,
            maxTx,
            maxCumulative,
            validFrom,
            validUntil
        );
    }

    // -------------------------------------------------------
    // IAgentMandateRegistry — revokeMandate
    // -------------------------------------------------------

    /// @inheritdoc IAgentMandateRegistry
    function revokeMandate(bytes32 mandateId) external {
        _requireOwner(mandateId);
        Mandate storage m = _mandates[mandateId];
        // Mandate may already be expired or have been executed; revoke anyway.
        m.revoked = true;
        emit MandateWasRevoked(mandateId, msg.sender);
    }

    // -------------------------------------------------------
    // IAgentMandateRegistry — extendMandate
    // -------------------------------------------------------

    /// @inheritdoc IAgentMandateRegistry
    function extendMandate(bytes32 mandateId, uint256 newValidUntil) external {
        _requireOwner(mandateId);
        Mandate storage m = _mandates[mandateId];
        if (m.revoked) revert MandateRevoked();
        require(newValidUntil > m.validUntil, "must extend");
        m.validUntil = newValidUntil;
        emit MandateExtended(mandateId, newValidUntil);
    }

    // -------------------------------------------------------
    // IAgentMandateRegistry — recordUsage (gate only)
    // -------------------------------------------------------

    /// @inheritdoc IAgentMandateRegistry
    function recordUsage(bytes32 mandateId, uint256 amount) external {
        require(msg.sender == executionGate, "caller not gate");
        Mandate storage m = _mandates[mandateId];
        if (m.used + amount > m.maxCumulative) revert CumulativeLimitExceeded();
        m.used += amount;
        emit MandateUsageUpdated(mandateId, m.used);
    }

    // -------------------------------------------------------
    // IAgentMandateRegistry — validateMandate (read-only)
    // -------------------------------------------------------

    /// @inheritdoc IAgentMandateRegistry
    /// @dev Validation order matches the plan (§7):
    ///      1. mandate exists
    ///      2. mandate timing valid
    ///      3. mandate not revoked
    ///      4. caller is the authorized agent
    ///      5. requested action is allowed
    ///      6. target is allowed
    ///      7. amount <= maxTx
    ///      8. used + amount <= maxCumulative
    function validateMandate(
        bytes32 mandateId,
        address agent,
        address target,
        uint256 action,
        uint256 amount
    ) external view {
        Mandate storage m = _mandates[mandateId];

        // 1. exists
        if (m.agent == address(0)) revert MandateNotFound();

        // 2. timing
        if (block.timestamp < m.validFrom) revert MandateNotYetValid();
        if (block.timestamp > m.validUntil) revert MandateExpired();

        // 3. revoked
        if (m.revoked) revert MandateRevoked();

        // 4. agent identity
        if (agent != m.agent) revert CallerNotAgent();

        // 5. action allowed
        if (!ActionMask.isAllowed(m.allowedActionsMask, action)) revert ActionNotAllowed();

        // 6. target allowed
        if (target != m.allowedTarget) revert TargetNotAllowed();

        // 7. per-tx limit
        if (amount > m.maxTx) revert TxLimitExceeded();

        // 8. cumulative limit
        if (m.used + amount > m.maxCumulative) revert CumulativeLimitExceeded();
    }

    // -------------------------------------------------------
    // IAgentMandateRegistry — view functions
    // -------------------------------------------------------

    /// @inheritdoc IAgentMandateRegistry
    function getMandate(bytes32 mandateId) external view returns (Mandate memory) {
        return _mandates[mandateId];
    }

    /// @inheritdoc IAgentMandateRegistry
    function mandateOwner(bytes32 mandateId) external view returns (address) {
        return _mandateOwner[mandateId];
    }

    /// @inheritdoc IAgentMandateRegistry
    function ownerNonce(address owner_) external view returns (uint256) {
        return _ownerNonce[owner_];
    }

    /// @inheritdoc IAgentMandateRegistry
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // -------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------

    function _requireOwner(bytes32 mandateId) internal view {
        if (_mandates[mandateId].agent == address(0)) revert MandateNotFound();
        if (_mandateOwner[mandateId] != msg.sender) revert NotMandateOwner();
    }
}
