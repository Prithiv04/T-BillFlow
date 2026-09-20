// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./Types.sol";

// ============================================================
//  IExecutionGate.sol  —  Authoritative interface
//
//  AgentExecutionGate.sol MUST implement this interface exactly.
// ============================================================

interface IExecutionGate {

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event Executed(
        bytes32 indexed mandateId,
        address indexed agent,
        address indexed target,
        bytes4  selector,
        address asset,
        uint256 action,
        uint256 amount
    );

    event ExecutionBlocked(
        bytes32 indexed mandateId,
        address indexed agent,
        bytes   reason
    );

    event SelectorAllowlisted(address indexed target, bytes4 indexed selector, bool allowed);

    event GateWasPaused(address indexed by);
    event GateWasUnpaused(address indexed by);

    // -------------------------------------------------------
    // Errors (gate-level; registry and oracle errors bubble up)
    // -------------------------------------------------------

    error GatePaused();
    error SelectorNotAllowed();

    // -------------------------------------------------------
    // Core execution
    // -------------------------------------------------------

    /// @notice Execute an agent action if all gate + registry + oracle checks pass.
    ///         The gate is the final on-chain authority.
    ///         Checks run in deterministic order (see plan §9).
    /// @param req  The execution request.
    function execute(ExecutionRequest calldata req) external;

    /// @notice Read-only simulation of execute(). Returns (allowed, reason).
    ///         MUST use IDENTICAL validation logic to execute().
    ///         Returns (true, "") if the request would be allowed.
    ///         Returns (false, encodedError) if it would be blocked.
    function canExecute(ExecutionRequest calldata req)
        external
        view
        returns (bool allowed, bytes memory reason);

    // -------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------

    /// @notice Allowlist or de-list a (target, selector) pair.
    function setSelectorAllowed(address target, bytes4 selector, bool allowed) external;

    /// @notice Emergency pause — blocks all execute() calls.
    function pause() external;

    /// @notice Resume after emergency pause.
    function unpause() external;

    // -------------------------------------------------------
    // View functions
    // -------------------------------------------------------

    /// @notice Returns true if (target, selector) is allowlisted.
    function isSelectorAllowed(address target, bytes4 selector) external view returns (bool);

    /// @notice Returns true if the gate is currently paused.
    function paused() external view returns (bool);
}
