// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ============================================================
//  TBillVault.sol — Phase 4 Implementation
//
//  Simulated tokenized T-Bill vault for testnet demonstration.
//  Built on OpenZeppelin ERC-4626 with:
//   - Standard ERC-4626 deposit, mint, withdraw, and redeem flows
//   - AgentExecutionGate integration for mediated execution
//   - Simulated allocation action (Actions.ALLOCATE)
// ============================================================

contract TBillVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------
    // State Variables
    // -------------------------------------------------------

    /// @notice The AgentExecutionGate contract permitted to mediate vault actions.
    address public executionGate;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event ExecutionGateUpdated(address indexed newGate);
    event Allocated(uint256 amount, uint256 timestamp);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /// @param underlyingAsset_ The test stablecoin/underlying asset (e.g. USDC).
    /// @param name_ Vault share name (e.g. "T-BillFlow Vault Share").
    /// @param symbol_ Vault share symbol (e.g. "tbUSD").
    /// @param initialOwner_ Address with administrative authority.
    constructor(
        IERC20 underlyingAsset_,
        string memory name_,
        string memory symbol_,
        address initialOwner_
    )
        ERC4626(underlyingAsset_)
        ERC20(name_, symbol_)
        Ownable(initialOwner_)
    {
        require(initialOwner_ != address(0), "zero owner address");
        require(address(underlyingAsset_) != address(0), "zero asset address");
    }

    // -------------------------------------------------------
    // Gate Configuration
    // -------------------------------------------------------

    /// @notice Set or update the authorized AgentExecutionGate.
    function setExecutionGate(address _executionGate) external onlyOwner {
        require(_executionGate != address(0), "zero gate address");
        executionGate = _executionGate;
        emit ExecutionGateUpdated(_executionGate);
    }

    // -------------------------------------------------------
    // Protocol / Simulation Actions
    // -------------------------------------------------------

    /// @notice Simulate capital allocation towards T-Bills (corresponds to Actions.ALLOCATE).
    function allocate(uint256 amount) external {
        require(
            msg.sender == owner() || msg.sender == executionGate,
            "not authorized to allocate"
        );
        emit Allocated(amount, block.timestamp);
    }

    // -------------------------------------------------------
    // ERC-4626 Overrides for Gate Integration
    // -------------------------------------------------------

    /// @dev Overridden to allow the registered executionGate to execute deposits
    ///      on behalf of a mandate owner (pulling assets from receiver).
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        address from = (caller == executionGate) ? receiver : caller;
        SafeERC20.safeTransferFrom(IERC20(asset()), from, address(this), assets);
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }

    /// @dev Overridden to allow the registered executionGate to execute redemptions
    ///      on behalf of a mandate owner without requiring double approval.
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        if (caller != owner && caller != executionGate) {
            _spendAllowance(owner, caller, shares);
        }

        _burn(owner, shares);
        SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }
}
