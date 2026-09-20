// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {TBillVault} from "../src/TBillVault.sol";
import {MockUSDC} from "./DeployTestToken.s.sol";

// ============================================================
//  Deploy.s.sol — Master Arbitrum Sepolia Deployment Script
//
//  Deterministic Deployment Sequence:
//   1. Deploy/resolve underlying test token (MockUSDC)
//   2. Deploy AgentMandateRegistry
//   3. Deploy RWAStateOracle
//   4. Deploy AgentExecutionGate (linking Registry and Oracle)
//   5. Deploy TBillVault (ERC-4626 vault linking test token)
//   6. Post-deployment wiring:
//      - registry.setExecutionGate(gate)
//      - vault.setExecutionGate(gate)
//   7. Oracle initial state:
//      - oracle.addAsset(token, 1 days)
//      - oracle.updateAssetState(token, 1e18, true, 3)
//   8. Gate allowlist:
//      - allowlist vault selectors (deposit, redeem, withdraw, allocate)
// ============================================================

contract DeployScript is Script {
    struct DeploymentResult {
        address testToken;
        address mandateRegistry;
        address rwaOracle;
        address executionGate;
        address tbillVault;
    }

    function run() external returns (DeploymentResult memory result) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("==================================================");
        console2.log("Starting T-BillFlow 2.0 Deployment on Arbitrum Sepolia");
        console2.log("Deployer Address:", deployer);
        console2.log("==================================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Resolve or Deploy Test Token
        address testTokenAddr;
        try vm.envAddress("TEST_TOKEN_ADDRESS") returns (address existingToken) {
            if (existingToken != address(0)) {
                testTokenAddr = existingToken;
                console2.log("Reusing existing test token at:", testTokenAddr);
            } else {
                MockUSDC newToken = new MockUSDC();
                testTokenAddr = address(newToken);
                console2.log("Deployed new MockUSDC at:", testTokenAddr);
            }
        } catch {
            MockUSDC newToken = new MockUSDC();
            testTokenAddr = address(newToken);
            console2.log("Deployed new MockUSDC at:", testTokenAddr);
        }

        // 2. Deploy AgentMandateRegistry
        AgentMandateRegistry registry = new AgentMandateRegistry(deployer);
        console2.log("1/4 AgentMandateRegistry deployed at:", address(registry));

        // 3. Deploy RWAStateOracle
        RWAStateOracle oracle = new RWAStateOracle(deployer);
        console2.log("2/4 RWAStateOracle deployed at:", address(oracle));

        // 4. Deploy AgentExecutionGate
        AgentExecutionGate gate = new AgentExecutionGate(
            deployer,
            address(registry),
            address(oracle)
        );
        console2.log("3/4 AgentExecutionGate deployed at:", address(gate));

        // 5. Deploy TBillVault
        TBillVault vault = new TBillVault(
            IERC20(testTokenAddr),
            "T-BillFlow Vault Shares",
            "tbUSD",
            deployer
        );
        console2.log("4/4 TBillVault deployed at:", address(vault));

        // 6. Post-deployment Wiring
        registry.setExecutionGate(address(gate));
        console2.log("-> Linked MandateRegistry to ExecutionGate");

        vault.setExecutionGate(address(gate));
        console2.log("-> Linked TBillVault to ExecutionGate");

        // 7. Initial Oracle Configuration
        oracle.addAsset(testTokenAddr, 1 days);
        oracle.updateAssetState(testTokenAddr, 1e18, true, 3);
        console2.log("-> Oracle configured with asset, $1.00 NAV, open redemption, tier 3");

        // 8. Gate Selector Allowlisting
        bytes4 depositSel = bytes4(keccak256("deposit(uint256,address)"));
        bytes4 redeemSel = bytes4(keccak256("redeem(uint256,address,address)"));
        bytes4 withdrawSel = bytes4(keccak256("withdraw(uint256,address,address)"));
        bytes4 allocateSel = bytes4(keccak256("allocate(uint256)"));

        gate.setSelectorAllowed(address(vault), depositSel, true);
        gate.setSelectorAllowed(address(vault), redeemSel, true);
        gate.setSelectorAllowed(address(vault), withdrawSel, true);
        gate.setSelectorAllowed(address(vault), allocateSel, true);
        console2.log("-> Allowlisted vault selectors on ExecutionGate");

        vm.stopBroadcast();

        result = DeploymentResult({
            testToken: testTokenAddr,
            mandateRegistry: address(registry),
            rwaOracle: address(oracle),
            executionGate: address(gate),
            tbillVault: address(vault)
        });

        console2.log("==================================================");
        console2.log("Deployment & Configuration Complete!");
        console2.log("==================================================");
        console2.log("TEST_TOKEN_ADDRESS=", result.testToken);
        console2.log("AGENT_MANDATE_REGISTRY_ADDRESS=", result.mandateRegistry);
        console2.log("RWA_STATE_ORACLE_ADDRESS=", result.rwaOracle);
        console2.log("AGENT_EXECUTION_GATE_ADDRESS=", result.executionGate);
        console2.log("TBILL_VAULT_ADDRESS=", result.tbillVault);
        console2.log("==================================================");
    }
}
