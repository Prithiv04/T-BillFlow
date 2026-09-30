// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IComplianceRegistry} from "./IComplianceRegistry.sol";

// ============================================================
//  ComplianceRegistry.sol
//
//  Production compliance and investor eligibility enforcer.
//  Maintains:
//   - KYC/AML allowlists verified by off-chain identity providers
//   - Sanction screen blacklists (OFAC, etc.)
//   - Jurisdiction-specific investment constraints
//   - Permissioned RWA asset transfer policies
// ============================================================

contract ComplianceRegistry is IComplianceRegistry, Ownable {

    // -------------------------------------------------------
    // State Variables
    // -------------------------------------------------------

    /// @dev wallet => KYC approved status
    mapping(address => bool) private _kycApproved;

    /// @dev wallet => Sanctioned status
    mapping(address => bool) private _sanctioned;

    /// @dev wallet => ISO-3166 numeric country code (e.g. 840 for US)
    mapping(address => uint16) private _walletJurisdiction;

    /// @dev countryCode => whether jurisdiction is allowed
    mapping(uint16 => bool) private _jurisdictionAllowed;

    /// @dev asset => whether asset transfer restrictions apply
    mapping(address => bool) private _assetTransferRestricted;

    /// @dev Authorized compliance attestors / oracles
    mapping(address => bool) public isComplianceOfficer;

    // -------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------

    modifier onlyCompliance() {
        require(msg.sender == owner() || isComplianceOfficer[msg.sender], "not authorized compliance officer");
        _;
    }

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    constructor(address initialOwner) Ownable(initialOwner) {
        require(initialOwner != address(0), "zero owner");
        // By default, common compliant jurisdictions can be enabled or configured
        _jurisdictionAllowed[0] = true; // Default / global unassigned
    }

    // -------------------------------------------------------
    // Verification logic
    // -------------------------------------------------------

    /// @inheritdoc IComplianceRegistry
    function isWalletEligible(
        address investor,
        address, /* asset */
        uint256  /* action */
    ) external view override returns (bool, bytes memory) {
        // 1. Sanctions check
        if (_sanctioned[investor]) {
            return (false, abi.encodeWithSelector(WalletSanctioned.selector, investor));
        }

        // 2. KYC Approval check
        if (!_kycApproved[investor]) {
            return (false, abi.encodeWithSelector(InvestorNotKYCApproved.selector, investor));
        }

        // 3. Jurisdiction check
        uint16 jurisdiction = _walletJurisdiction[investor];
        if (jurisdiction != 0 && !_jurisdictionAllowed[jurisdiction]) {
            return (false, abi.encodeWithSelector(JurisdictionRestricted.selector, investor, jurisdiction));
        }

        return (true, "");
    }

    /// @inheritdoc IComplianceRegistry
    function checkTransferPolicy(
        address from,
        address to,
        address asset,
        uint256 amount
    ) external view override returns (bool, bytes memory) {
        if (_assetTransferRestricted[asset]) {
            if (!_kycApproved[to] || _sanctioned[to] || _sanctioned[from]) {
                return (false, abi.encodeWithSelector(TransferRestricted.selector, from, to, amount));
            }
        }
        return (true, "");
    }

    /// @inheritdoc IComplianceRegistry
    function isKYCApproved(address wallet) external view override returns (bool) {
        return _kycApproved[wallet];
    }

    /// @inheritdoc IComplianceRegistry
    function isSanctioned(address wallet) external view override returns (bool) {
        return _sanctioned[wallet];
    }

    function getWalletJurisdiction(address wallet) external view returns (uint16) {
        return _walletJurisdiction[wallet];
    }

    function isJurisdictionAllowed(uint16 countryCode) external view returns (bool) {
        return _jurisdictionAllowed[countryCode];
    }

    function isAssetTransferRestricted(address asset) external view returns (bool) {
        return _assetTransferRestricted[asset];
    }

    // -------------------------------------------------------
    // Admin / Compliance Management
    // -------------------------------------------------------

    function setComplianceOfficer(address officer, bool authorized) external onlyOwner {
        require(officer != address(0), "zero address");
        isComplianceOfficer[officer] = authorized;
    }

    function setKYCStatus(
        address wallet,
        bool approved,
        uint16 jurisdiction
    ) external onlyCompliance {
        require(wallet != address(0), "zero address");
        _kycApproved[wallet] = approved;
        _walletJurisdiction[wallet] = jurisdiction;
        emit KYCStatusUpdated(wallet, approved, jurisdiction);
    }

    function setSanctionStatus(address wallet, bool sanctioned) external onlyCompliance {
        require(wallet != address(0), "zero address");
        _sanctioned[wallet] = sanctioned;
        emit SanctionStatusUpdated(wallet, sanctioned);
    }

    function setJurisdictionPolicy(uint16 countryCode, bool allowed) external onlyCompliance {
        _jurisdictionAllowed[countryCode] = allowed;
        emit JurisdictionPolicyUpdated(countryCode, allowed);
    }

    function setAssetTransferPolicy(address asset, bool restricted) external onlyCompliance {
        require(asset != address(0), "zero address");
        _assetTransferRestricted[asset] = restricted;
        emit AssetTransferPolicyUpdated(asset, restricted);
    }
}
