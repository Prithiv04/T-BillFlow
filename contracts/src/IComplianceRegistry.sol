// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// ============================================================
//  IComplianceRegistry.sol
//
//  Authoritative compliance, KYC/AML, and transfer policy interface.
//  Enforces investor and wallet eligibility at the AgentExecutionGate.
// ============================================================

interface IComplianceRegistry {

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event KYCStatusUpdated(address indexed wallet, bool approved, uint16 indexed jurisdiction);
    event SanctionStatusUpdated(address indexed wallet, bool sanctioned);
    event JurisdictionPolicyUpdated(uint16 indexed countryCode, bool allowed);
    event AssetTransferPolicyUpdated(address indexed asset, bool restricted);

    // -------------------------------------------------------
    // Errors
    // -------------------------------------------------------

    error InvestorNotKYCApproved(address investor);
    error WalletSanctioned(address wallet);
    error JurisdictionRestricted(address investor, uint16 countryCode);
    error TransferRestricted(address from, address to, uint256 amount);

    // -------------------------------------------------------
    // Verification functions
    // -------------------------------------------------------

    /// @notice Validates whether an investor wallet is eligible to execute an action on an asset.
    /// @param investor The capital owner address (mandate owner).
    /// @param asset The RWA / settlement token address.
    /// @param action The requested action bitmask.
    /// @return eligible True if compliant, false otherwise.
    /// @return reason Encoded custom error reason if not eligible.
    function isWalletEligible(
        address investor,
        address asset,
        uint256 action
    ) external view returns (bool eligible, bytes memory reason);

    /// @notice Validates whether a token transfer satisfies asset transfer restrictions.
    function checkTransferPolicy(
        address from,
        address to,
        address asset,
        uint256 amount
    ) external view returns (bool allowed, bytes memory reason);

    /// @notice Read KYC approval status for a wallet.
    function isKYCApproved(address wallet) external view returns (bool);

    /// @notice Read sanction status for a wallet.
    function isSanctioned(address wallet) external view returns (bool);
}
