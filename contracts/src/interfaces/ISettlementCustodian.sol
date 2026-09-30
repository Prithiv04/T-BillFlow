// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// ============================================================
//  ISettlementCustodian.sol
//
//  Interface modeling real institutional settlement, custody,
//  and prime-brokerage clearing states.
//  Bridging on-chain token movements with off-chain Treasury settlement.
// ============================================================

interface ISettlementCustodian {

    enum SettlementState {
        PENDING_DEPOSIT,            // USDC received on-chain, awaiting custody wire
        IN_TRANSIT,                 // Fiat wire initiated to prime broker / custodian
        INVESTED_IN_TREASURIES,     // T-Bills purchased by broker-dealer, tokens minted
        PENDING_REDEMPTION,         // Token burned, redemption wire pending
        SETTLED,                    // Fully settled & cleared
        FAILED                      // Wire failed / rejected
    }

    struct SettlementRecord {
        bytes32 orderId;
        address investor;
        address settlementToken;
        uint256 amount;
        SettlementState state;
        uint256 initiatedAt;
        uint256 settledAt;
        string custodianRef;
    }

    event SettlementInitiated(bytes32 indexed orderId, address indexed investor, uint256 amount);
    event SettlementStatusChanged(bytes32 indexed orderId, SettlementState newState, string custodianRef);

    function getSettlementRecord(bytes32 orderId) external view returns (SettlementRecord memory);
    function isSettled(bytes32 orderId) external view returns (bool);
}
