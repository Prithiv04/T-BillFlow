// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";
import {RWAAssetRegistry} from "../src/RWAAssetRegistry.sol";
import {TBillVault} from "../src/TBillVault.sol";

// ============================================================
//  DeployProduction.s.sol — Arbitrum One Production Deployment
//
//  Prerequisites before running:
//  ─────────────────────────────
//  1. EXTERNAL_DEPENDENCY: Legal entity (Delaware Statutory Trust or equivalent)
//     must be established to hold the underlying T-Bill positions.
//  2. EXTERNAL_DEPENDENCY: KYC/AML compliance provider must be configured and
//     integrated with ComplianceRegistry before accepting investor capital.
//  3. EXTERNAL_DEPENDENCY: Institutional custodian agreement required for
//     off-chain settlement of physical T-Bills.
//  4. EXTERNAL_DEPENDENCY: Independent security audit of all contracts.
//  5. EXTERNAL_DEPENDENCY: RWA data provider must be approved as an oracle
//     signer via oracle.setApprovedProvider() after deployment.
//  6. Set ORACLE_ATTESTATION_SIGNER_KEY in secrets manager.
//
//  Run (DRY RUN first — never skip this):
//    forge script script/DeployProduction.s.sol --rpc-url arbitrum_one
//
//  Run (broadcast to chain — requires chain ID safety check to pass):
//    forge script script/DeployProduction.s.sol \
//      --rpc-url arbitrum_one \
//      --broadcast \
//      --verify \
//      --etherscan-api-key $ARBISCAN_API_KEY
//
//  Post-deployment checklist (complete BEFORE accepting any investor capital):
//  ─────────────────────────────────────────────────────────────────────────────
//  [ ] Transfer ownership of all contracts to a multisig (Gnosis Safe).
//  [ ] Authorize RWA attestation signer via oracle.setApprovedProvider().
//  [ ] Configure ComplianceRegistry with compliance officer address.
//  [ ] Register real tokenized RWA assets via assetRegistry.configureAsset().
//  [ ] Register RWA assets in oracle via oracle.addAsset() with appropriate maxNavAge.
//  [ ] Perform end-to-end canExecute() dry-run before first live mandate.
//  [ ] Do NOT grant mandates until all compliance infrastructure is operational.
// ============================================================

contract DeployProductionScript is Script {

    // ── Safety constants ──────────────────────────────────────────────────────

    /// @dev Arbitrum One mainnet chain ID. Deployment reverts on any other chain.
    uint256 public constant ARBITRUM_ONE_CHAIN_ID = 42161;

    /// @dev Circle Native USDC on Arbitrum One.
    ///      Address: https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831
    address public constant ARBITRUM_ONE_NATIVE_USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    /// @dev Maximum acceptable NAV age for oracle freshness (24 hours for T-Bills).
    uint256 public constant MAX_NAV_AGE_SECONDS = 86400;

    // ── Deployment result ─────────────────────────────────────────────────────

    struct ProductionDeploymentResult {
        address settlementToken;
        address mandateRegistry;
        address rwaOracle;
        address complianceRegistry;
        address assetRegistry;
        address executionGate;
        address tbillVault;
    }

    // ── Main deployment ───────────────────────────────────────────────────────

    function run() external returns (ProductionDeploymentResult memory result) {
        // ── SAFETY CHECK: block accidental non-mainnet deployment ─────────────
        // This is the most important guard in this script.
        // Deploying to the wrong chain with a "production" configuration is a
        // serious operational error. This check cannot be bypassed without editing
        // the constant above, which forces an intentional code change.
        require(
            block.chainid == ARBITRUM_ONE_CHAIN_ID,
            "DeployProduction: WRONG CHAIN. "
            "This script must only run on Arbitrum One (chainId 42161). "
            "For testnet, use Deploy.s.sol instead."
        );

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Allow override of settlement token for future multi-token support.
        // Default is canonical Arbitrum One Native USDC.
        address settlementToken = vm.envOr(
            "PRODUCTION_SETTLEMENT_TOKEN",
            ARBITRUM_ONE_NATIVE_USDC
        );

        // ── SAFETY CHECK: reject zero addresses ───────────────────────────────
        require(deployer != address(0), "DeployProduction: zero deployer address");
        require(settlementToken != address(0), "DeployProduction: zero settlement token");

        // ── IMPORTANT: deployer will initially be the owner of all contracts.
        //    TRANSFER OWNERSHIP TO A MULTISIG IMMEDIATELY after deployment.
        //    Do not leave a hot wallet as the sole owner of production contracts.

        console2.log("==================================================");
        console2.log("T-BillFlow 2.0 - Production Deployment (Arbitrum One)");
        console2.log("Chain ID:         ", block.chainid);
        console2.log("Deployer:         ", deployer);
        console2.log("Settlement Token: ", settlementToken);
        console2.log("==================================================");
        console2.log("WARNING: Transfer all contract ownership to a multisig");
        console2.log("         (Gnosis Safe) before accepting investor capital.");
        console2.log("==================================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. AgentMandateRegistry — stores and validates EIP-712 signed mandates
        AgentMandateRegistry registry = new AgentMandateRegistry(deployer);
        console2.log("[1/7] AgentMandateRegistry: ", address(registry));

        // 2. RWAStateOracle — authoritative on-chain RWA state with EIP-712 attestations
        RWAStateOracle oracle = new RWAStateOracle(deployer);
        console2.log("[2/7] RWAStateOracle:        ", address(oracle));

        // 3. ComplianceRegistry — KYC/AML/Sanctions enforcement
        //    NOTE: configure a compliance officer via setComplianceOfficer() post-deploy.
        //    EXTERNAL_DEPENDENCY: KYC/AML data feed from identity provider required.
        ComplianceRegistry compliance = new ComplianceRegistry(deployer);
        console2.log("[3/7] ComplianceRegistry:    ", address(compliance));

        // 4. RWAAssetRegistry — links settlement tokens to tokenized RWA assets
        //    NOTE: configure real RWA assets via configureAsset() post-deploy.
        //    EXTERNAL_DEPENDENCY: Real tokenized T-Bill token addresses required.
        RWAAssetRegistry assetReg = new RWAAssetRegistry(deployer);
        console2.log("[4/7] RWAAssetRegistry:      ", address(assetReg));

        // 5. AgentExecutionGate — deterministic authorization + eligibility enforcement
        AgentExecutionGate gate = new AgentExecutionGate(
            deployer,
            address(registry),
            address(oracle)
        );
        gate.setComplianceRegistry(address(compliance));
        console2.log("[5/7] AgentExecutionGate:    ", address(gate));

        // 6. TBillVault — ERC-4626 vault backed by real settlement token (USDC)
        TBillVault vault = new TBillVault(
            IERC20(settlementToken),
            "T-BillFlow Production Vault",
            "tbUSD",
            deployer
        );
        console2.log("[6/7] TBillVault:            ", address(vault));

        // 7. Wire all contracts together
        registry.setExecutionGate(address(gate));
        vault.setExecutionGate(address(gate));
        console2.log("[7/7] Wiring complete.");

        // 8. Allowlist vault selectors in gate
        bytes4 depositSel  = bytes4(keccak256("deposit(uint256,address)"));
        bytes4 redeemSel   = bytes4(keccak256("redeem(uint256,address,address)"));
        bytes4 withdrawSel = bytes4(keccak256("withdraw(uint256,address,address)"));
        bytes4 allocateSel = bytes4(keccak256("allocate(uint256)"));

        gate.setSelectorAllowed(address(vault), depositSel,  true);
        gate.setSelectorAllowed(address(vault), redeemSel,   true);
        gate.setSelectorAllowed(address(vault), withdrawSel, true);
        gate.setSelectorAllowed(address(vault), allocateSel, true);

        // 9. Register the settlement token in the oracle.
        //    NOTE: updateAssetState() must be called by an approved provider BEFORE any
        //    execution — oracle will reject all executions until NAV is set.
        //    EXTERNAL_DEPENDENCY: call oracle.setApprovedProvider(signerAddress, true)
        //    after deployment using the ORACLE_ATTESTATION_SIGNER_KEY address.
        oracle.addAsset(settlementToken, MAX_NAV_AGE_SECONDS);

        vm.stopBroadcast();

        console2.log("==================================================");
        console2.log("Deployment complete. POST-DEPLOYMENT CHECKLIST:");
        console2.log("  1. Transfer ownership of ALL contracts to multisig.");
        console2.log("  2. Call oracle.setApprovedProvider(signerAddr, true).");
        console2.log("  3. Call compliance.setComplianceOfficer(officerAddr, true).");
        console2.log("  4. Configure assetRegistry with real RWA token addresses.");
        console2.log("  5. Register real RWA assets in oracle with oracle.addAsset().");
        console2.log("  6. Run end-to-end canExecuteAs() dry-run before first mandate.");
        console2.log("  7. Do NOT grant mandates until compliance is fully configured.");
        console2.log("==================================================");

        return ProductionDeploymentResult({
            settlementToken:   settlementToken,
            mandateRegistry:   address(registry),
            rwaOracle:         address(oracle),
            complianceRegistry: address(compliance),
            assetRegistry:     address(assetReg),
            executionGate:     address(gate),
            tbillVault:        address(vault)
        });
    }
}
