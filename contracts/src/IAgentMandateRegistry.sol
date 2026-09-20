// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Types.sol";

// ============================================================
//  IAgentMandateRegistry.sol  —  Authoritative interface
//
//  AgentMandateRegistry.sol MUST implement this interface
//  exactly. Do NOT add extra public functions that change
//  the mandate model without updating this interface first.
// ============================================================

interface IAgentMandateRegistry {

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event MandateGranted(
        bytes32 indexed mandateId,
        address indexed owner,
        address indexed agent,
        address asset,
        address allowedTarget,
        uint256 allowedActionsMask,
        uint256 maxTx,
        uint256 maxCumulative,
        uint256 validFrom,
        uint256 validUntil
    );

    event MandateWasRevoked(bytes32 indexed mandateId, address indexed owner);

    event MandateExtended(bytes32 indexed mandateId, uint256 newValidUntil);

    event MandateUsageUpdated(bytes32 indexed mandateId, uint256 used);

    // -------------------------------------------------------
    // Errors
    // -------------------------------------------------------

    error MandateNotFound();
    error MandateNotYetValid();
    error MandateExpired();
    error MandateRevoked();
    error ActionNotAllowed();
    error TargetNotAllowed();
    error CallerNotAgent();
    error TxLimitExceeded();
    error CumulativeLimitExceeded();
    error InvalidSignature();
    error InvalidMandateParams();
    error NotMandateOwner();

    // -------------------------------------------------------
    // Core write functions
    // -------------------------------------------------------

    /// @notice Create a new mandate. Signed via EIP-712 by the mandate owner.
    /// @param agent        The address authorised to act on behalf of the owner.
    /// @param asset        The RWA asset in scope.
    /// @param allowedTarget The single contract the agent may call.
    /// @param allowedActionsMask Bitmask of permitted Actions (see Types.sol).
    /// @param maxTx        Maximum per-transaction amount.
    /// @param maxCumulative Total lifetime spending limit.
    /// @param validFrom    Unix timestamp from which the mandate is active.
    /// @param validUntil   Unix timestamp after which the mandate expires.
    /// @param ownerNonce   Monotonically increasing nonce for replay protection.
    /// @param signature    EIP-712 signature from the mandate owner.
    /// @return mandateId   The keccak256 identifier for the created mandate.
    function grantMandate(
        address agent,
        address asset,
        address allowedTarget,
        uint256 allowedActionsMask,
        uint256 maxTx,
        uint256 maxCumulative,
        uint256 validFrom,
        uint256 validUntil,
        uint256 ownerNonce,
        bytes calldata signature
    ) external returns (bytes32 mandateId);

    /// @notice Revoke a mandate. Only the mandate owner may call this.
    function revokeMandate(bytes32 mandateId) external;

    /// @notice Extend a mandate's validUntil. Only the mandate owner may call.
    function extendMandate(bytes32 mandateId, uint256 newValidUntil) external;

    // -------------------------------------------------------
    // Called by AgentExecutionGate
    // -------------------------------------------------------

    /// @notice Record consumption of `amount` units under a mandate.
    ///         Only callable by the registered ExecutionGate.
    function recordUsage(bytes32 mandateId, uint256 amount) external;

    // -------------------------------------------------------
    // Validation (read-only)
    // -------------------------------------------------------

    /// @notice Validate that `agent` can act under `mandateId` for `action`
    ///         targeting `target` with `amount`.
    ///         Reverts with a typed error if any check fails.
    ///         Does NOT mutate state.
    function validateMandate(
        bytes32 mandateId,
        address agent,
        address target,
        uint256 action,
        uint256 amount
    ) external view;

    // -------------------------------------------------------
    // View functions
    // -------------------------------------------------------

    /// @notice Return the full Mandate struct for a given ID.
    function getMandate(bytes32 mandateId) external view returns (Mandate memory);

    /// @notice Return the owner of a mandate.
    function mandateOwner(bytes32 mandateId) external view returns (address);

    /// @notice Return the current owner nonce (for replay protection).
    function ownerNonce(address owner) external view returns (uint256);

    /// @notice Return the EIP-712 domain separator.
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}
