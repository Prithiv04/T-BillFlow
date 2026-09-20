// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IExecutionGate} from "./IExecutionGate.sol";
import {IAgentMandateRegistry} from "./IAgentMandateRegistry.sol";
import {IRWAStateOracle} from "./IRWAStateOracle.sol";
import {ExecutionRequest, Actions, ActionMask} from "./Types.sol";

// ============================================================
//  AgentExecutionGate.sol — Phase 3 Implementation
//
//  The core on-chain execution gate. Enforces:
//  - AUTHORIZATION ≠ ELIGIBILITY
//  - Per-target selector allowlisting
//  - Strict deterministic validation order
//  - Identical validation in canExecute() simulation
//  - Emergency pause / unpause controls
//  - Lifetime cumulative usage tracking via MandateRegistry
// ============================================================

contract AgentExecutionGate is IExecutionGate, Pausable, Ownable, ReentrancyGuard {
    // -------------------------------------------------------
    // Immutables
    // -------------------------------------------------------

    /// @notice Authoritative mandate registry.
    IAgentMandateRegistry public immutable mandateRegistry;

    /// @notice Authoritative RWA state oracle.
    IRWAStateOracle public immutable rwaOracle;

    // -------------------------------------------------------
    // State Variables
    // -------------------------------------------------------

    /// @dev target => selector => allowed
    mapping(address => mapping(bytes4 => bool)) private _allowedSelectors;

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /// @param initialOwner Address with admin/pause authority.
    /// @param _mandateRegistry Address of deployed AgentMandateRegistry.
    /// @param _rwaOracle Address of deployed RWAStateOracle.
    constructor(
        address initialOwner,
        address _mandateRegistry,
        address _rwaOracle
    ) Ownable(initialOwner) {
        require(initialOwner != address(0), "zero owner address");
        require(_mandateRegistry != address(0), "zero registry address");
        require(_rwaOracle != address(0), "zero oracle address");

        mandateRegistry = IAgentMandateRegistry(_mandateRegistry);
        rwaOracle = IRWAStateOracle(_rwaOracle);
    }

    // -------------------------------------------------------
    // Validation Logic (Deterministic Order per §9)
    // -------------------------------------------------------

    /// @dev Internal validation logic implementing the required deterministic check order:
    ///      1. Global emergency pause check (GatePaused)
    ///      2. Selector integrity and per-target allowlist check (SelectorNotAllowed)
    ///      3. Mandate validation via registry:
    ///         - Mandate exists (MandateNotFound)
    ///         - Mandate timing valid (MandateNotYetValid / MandateExpired)
    ///         - Mandate not revoked (MandateRevoked)
    ///         - Caller is authorized agent (CallerNotAgent)
    ///         - Requested action is allowed (ActionNotAllowed)
    ///         - Target is allowed (TargetNotAllowed)
    ///         - Transaction amount <= maxTx (TxLimitExceeded)
    ///         - Cumulative usage <= maxCumulative (CumulativeLimitExceeded)
    ///      4. RWA asset eligibility via oracle:
    ///         - Asset supported (AssetNotSupported)
    ///         - NAV fresh (NavStale)
    ///         - Redemption window open if REDEEM/WITHDRAW (RedemptionClosed)
    ///         - Liquidity tier sufficient if ALLOCATE (LiquidityTooLow)
    function _validate(ExecutionRequest calldata req, address caller) internal view {
        // 1. Gate paused
        if (paused()) {
            revert GatePaused();
        }

        // 2. Selector integrity & allowlist
        if (req.callData.length < 4 || bytes4(req.callData[:4]) != req.selector) {
            revert SelectorNotAllowed();
        }
        if (!_allowedSelectors[req.target][req.selector]) {
            revert SelectorNotAllowed();
        }

        // 3. Mandate validation
        mandateRegistry.validateMandate(
            req.mandateId,
            caller,
            req.target,
            req.action,
            req.amount
        );

        // Security hardening: ensure request asset strictly matches authorized mandate asset
        if (mandateRegistry.getMandate(req.mandateId).asset != req.asset) {
            revert IRWAStateOracle.AssetNotSupported();
        }

        // 4. RWA asset eligibility
        rwaOracle.isEligible(req.asset, req.action);
    }

    /// @notice External view helper exposed for canExecute() simulation.
    function checkExecution(ExecutionRequest calldata req, address caller) external view {
        _validate(req, caller);
    }

    // -------------------------------------------------------
    // Execution Functions
    // -------------------------------------------------------

    /// @inheritdoc IExecutionGate
    function execute(ExecutionRequest calldata req) external nonReentrant {
        // Validate all preconditions (reverts with typed custom error on failure)
        _validate(req, msg.sender);

        // Record usage in registry before external call (Checks-Effects-Interactions)
        mandateRegistry.recordUsage(req.mandateId, req.amount);

        // Forward call to target
        (bool success, bytes memory returnData) = req.target.call(req.callData);
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            } else {
                revert("Target execution failed");
            }
        }

        emit Executed(
            req.mandateId,
            msg.sender,
            req.target,
            req.selector,
            req.asset,
            req.action,
            req.amount
        );
    }

    /// @inheritdoc IExecutionGate
    function canExecute(ExecutionRequest calldata req)
        external
        view
        returns (bool allowed, bytes memory reason)
    {
        try this.checkExecution(req, msg.sender) {
            return (true, "");
        } catch (bytes memory err) {
            return (false, err);
        }
    }

    /// @notice Read-only simulation for an explicit agent address.
    function canExecuteAs(ExecutionRequest calldata req, address agent)
        external
        view
        returns (bool allowed, bytes memory reason)
    {
        try this.checkExecution(req, agent) {
            return (true, "");
        } catch (bytes memory err) {
            return (false, err);
        }
    }

    // -------------------------------------------------------
    // Admin Functions
    // -------------------------------------------------------

    /// @inheritdoc IExecutionGate
    function setSelectorAllowed(
        address target,
        bytes4 selector,
        bool allowed
    ) external onlyOwner {
        require(target != address(0), "zero target address");
        _allowedSelectors[target][selector] = allowed;
        emit SelectorAllowlisted(target, selector, allowed);
    }

    /// @inheritdoc IExecutionGate
    function pause() external onlyOwner {
        _pause();
        emit GateWasPaused(msg.sender);
    }

    /// @inheritdoc IExecutionGate
    function unpause() external onlyOwner {
        _unpause();
        emit GateWasUnpaused(msg.sender);
    }

    // -------------------------------------------------------
    // View Functions
    // -------------------------------------------------------

    /// @inheritdoc IExecutionGate
    function isSelectorAllowed(address target, bytes4 selector)
        external
        view
        returns (bool)
    {
        return _allowedSelectors[target][selector];
    }

    /// @inheritdoc IExecutionGate
    function paused()
        public
        view
        override(IExecutionGate, Pausable)
        returns (bool)
    {
        return super.paused();
    }
}
