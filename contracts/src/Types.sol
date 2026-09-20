// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// ============================================================
//  Types.sol  —  Shared types for T-BillFlow 2.0
//
//  This file is AUTHORITATIVE.
//  All contracts must import from here.
//  Do NOT redefine these types in other files.
// ============================================================

// ------------------------------------------------------------------
// Action bitmask constants
//
//  Each action is represented as a single bit in a uint256 bitmask.
//  A mandate's allowedActionsMask is the OR of the bits it permits.
// ------------------------------------------------------------------
library Actions {
    uint256 internal constant DEPOSIT  = 1 << 0; // 0x01
    uint256 internal constant REDEEM   = 1 << 1; // 0x02
    uint256 internal constant ALLOCATE = 1 << 2; // 0x04
    uint256 internal constant WITHDRAW = 1 << 3; // 0x08
    // Bits 4-255 reserved for future actions
}

// ------------------------------------------------------------------
// ActionMask library
//
//  Utility functions for encoding and checking action bitmasks.
// ------------------------------------------------------------------
library ActionMask {
    /// @notice Returns true if `action` (a single-bit constant) is set in `mask`.
    function isAllowed(uint256 mask, uint256 action) internal pure returns (bool) {
        return (mask & action) != 0;
    }

    /// @notice Encodes a single action into a bitmask. Action must be a power of two.
    function encode(uint256 action) internal pure returns (uint256) {
        return action;
    }

    /// @notice Combines two masks.
    function combine(uint256 a, uint256 b) internal pure returns (uint256) {
        return a | b;
    }
}

// ------------------------------------------------------------------
// Mandate struct
//
//  Stored in AgentMandateRegistry per mandate ID.
// ------------------------------------------------------------------
struct Mandate {
    address agent;           // The off-chain agent authorised to act
    address asset;           // The RWA/ERC-20 asset in scope
    address allowedTarget;   // The single contract the agent may call (e.g. TBillVault)
    uint256 allowedActionsMask; // Bitmask of permitted Actions
    uint256 maxTx;           // Maximum single-transaction amount (asset decimals)
    uint256 maxCumulative;   // Total lifetime budget (asset decimals)
    uint256 used;            // Cumulative amount already consumed
    uint256 validFrom;       // Earliest valid timestamp (unix)
    uint256 validUntil;      // Latest valid timestamp (unix)
    uint256 nonce;           // Monotonically increasing nonce for replay protection
    bool    revoked;         // True if owner has revoked the mandate
}

// ------------------------------------------------------------------
// ExecutionRequest struct
//
//  Passed to AgentExecutionGate.execute() / canExecute().
// ------------------------------------------------------------------
struct ExecutionRequest {
    bytes32 mandateId;  // Identifier of the mandate to act under
    address asset;      // RWA asset the action targets
    uint256 action;     // Single-bit action constant from Actions library
    uint256 amount;     // Transaction amount (asset decimals)
    address target;     // Contract to forward the call to
    bytes4  selector;   // Function selector to call on `target`
    bytes   callData;   // Complete calldata (must encode `selector` as first 4 bytes)
}

// ------------------------------------------------------------------
// RiskTier (exists per plan; inert in V1)
// ------------------------------------------------------------------
enum RiskTier { LOW, MEDIUM, HIGH }
