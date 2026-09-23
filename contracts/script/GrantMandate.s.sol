// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {Actions} from "../src/Types.sol";

// ============================================================
//  GrantMandate.s.sol — Create a real on-chain test mandate
//
//  This script:
//   1. Reads the current owner nonce from the registry
//   2. Constructs the EIP-712 GrantMandate struct hash
//   3. Signs it with vm.sign (uses PRIVATE_KEY from .env)
//   4. Calls registry.grantMandate() → emits MandateGranted
//   5. Logs the resulting mandateId for use in the frontend
//   6. Also mints 1,000,000 MockUSDC to the deployer
//   7. Approves the TBillVault to spend deployer's tokens (for gate-mediated deposit)
//   8. Refreshes oracle NAV to ensure NAV is fresh before execute
// ============================================================

interface IMockUSDC is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract GrantMandateScript is Script {

    // ── Deployed addresses (from broadcast/run-latest.json) ─────────────────
    address constant REGISTRY = 0x221C9a9F1A6EED91642955bAEe3208C2fc901d1d;
    address constant ORACLE   = 0x3eC0FEC36DE1f05087Dbda93c2335182383dEfed;
    address constant GATE     = 0xD39a16c7f36b6e103903342c0abd98fcF1F7c88d;
    address constant VAULT    = 0x2f9453ECe66D76431E3AcBe33770c60d79aDCDa5;
    address constant TOKEN    = 0xCde2fb76D39d060314231b15fd4d2719d6C2B354;

    // ── Mandate parameters ────────────────────────────────────────────────────
    // The agent IS the deployer in this demo — same key, same address.
    // In production the agent would be a separate off-chain key.
    uint256 constant MAX_TX          = 1_000_000e6;  // 1,000,000 USDC (6 decimals)
    uint256 constant MAX_CUMULATIVE  = 5_000_000e6;  // 5,000,000 USDC (6 decimals)
    uint256 constant VALID_DURATION  = 365 days;
    uint256 constant ACTIONS_MASK    = Actions.DEPOSIT | Actions.REDEEM;

    // EIP-712 typehash — must match AgentMandateRegistry GRANT_MANDATE_TYPEHASH
    bytes32 constant TYPEHASH = keccak256(
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

    function run() external {
        uint256 pk       = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("=================================================");
        console2.log("GrantMandate - Arbitrum Sepolia");
        console2.log("Deployer / Owner / Agent:", deployer);
        console2.log("=================================================");

        AgentMandateRegistry registry = AgentMandateRegistry(REGISTRY);
        RWAStateOracle oracle          = RWAStateOracle(ORACLE);
        IMockUSDC token                = IMockUSDC(TOKEN);

        // ── Read current owner nonce ──────────────────────────────────────────
        uint256 ownerNonce = registry.ownerNonce(deployer);
        console2.log("Current owner nonce:", ownerNonce);

        // ── Read EIP-712 domain separator ────────────────────────────────────
        bytes32 domainSep = registry.DOMAIN_SEPARATOR();
        console2.log("Domain separator computed on-chain.");

        // ── Build timing ──────────────────────────────────────────────────────
        uint256 validFrom  = block.timestamp;
        uint256 validUntil = block.timestamp + VALID_DURATION;

        // ── Compute EIP-712 struct hash ───────────────────────────────────────
        bytes32 structHash = keccak256(abi.encode(
            TYPEHASH,
            deployer,       // agent  (same as owner for this demo)
            TOKEN,          // asset
            VAULT,          // allowedTarget
            ACTIONS_MASK,   // allowedActionsMask
            MAX_TX,
            MAX_CUMULATIVE,
            validFrom,
            validUntil,
            ownerNonce
        ));

        bytes32 digest = MessageHashUtils.toTypedDataHash(domainSep, structHash);

        // ── Sign with Foundry vm.sign ─────────────────────────────────────────
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        console2.log("EIP-712 signature computed.");

        // ── Start broadcast ──────────────────────────────────────────────────
        vm.startBroadcast(pk);

        // 1. Mint 1,000,000 MockUSDC to deployer (for deposit collateral)
        token.mint(deployer, 1_000_000e6);
        console2.log("Minted 1,000,000 MockUSDC to deployer.");

        // 2. Approve TBillVault to spend deployer tokens
        //    (vault's _deposit pulls from receiver = deployer in gate-mediated flow)
        token.approve(VAULT, type(uint256).max);
        console2.log("Approved TBillVault to spend deployer MockUSDC.");

        // 3. Refresh oracle NAV to ensure it's fresh (within maxNavAge = 1 day)
        oracle.updateAssetState(TOKEN, 1e18, true, 3);
        console2.log("Oracle NAV refreshed: $1.00, redemption open, tier 3.");

        // 4. Grant the mandate
        bytes32 mandateId = registry.grantMandate(
            deployer,       // agent
            TOKEN,          // asset
            VAULT,          // allowedTarget
            ACTIONS_MASK,   // allowedActionsMask
            MAX_TX,
            MAX_CUMULATIVE,
            validFrom,
            validUntil,
            ownerNonce,
            signature
        );

        vm.stopBroadcast();

        // ── Log results ───────────────────────────────────────────────────────
        console2.log("=================================================");
        console2.log("MANDATE GRANTED SUCCESSFULLY");
        console2.log("=================================================");
        console2.log("mandateId:", vm.toString(mandateId));
        console2.log("agent    :", deployer);
        console2.log("asset    :", TOKEN);
        console2.log("target   :", VAULT);
        console2.log("maxTx    : 1,000,000 USDC");
        console2.log("maxCumul : 5,000,000 USDC");
        console2.log("validFrom:", validFrom);
        console2.log("validUntil:", validUntil);
        console2.log("=================================================");
        console2.log("UPDATE frontend/src/lib/constants.ts:");
        console2.log("  DEMO_MANDATE_ID = ", vm.toString(mandateId));
        console2.log("=================================================");
    }
}
