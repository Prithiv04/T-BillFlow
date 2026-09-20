// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {TBillVault} from "../src/TBillVault.sol";

contract ConfigureGateScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address gateAddress = vm.envAddress("AGENT_EXECUTION_GATE_ADDRESS");
        address registryAddress = vm.envAddress("AGENT_MANDATE_REGISTRY_ADDRESS");
        address oracleAddress = vm.envAddress("RWA_STATE_ORACLE_ADDRESS");
        address vaultAddress = vm.envAddress("TBILL_VAULT_ADDRESS");
        address tokenAddress = vm.envAddress("TEST_TOKEN_ADDRESS");

        console2.log("Configuring Gate & Infrastructure from:", deployer);
        console2.log("Gate:", gateAddress);
        console2.log("Registry:", registryAddress);
        console2.log("Oracle:", oracleAddress);
        console2.log("Vault:", vaultAddress);
        console2.log("Token:", tokenAddress);

        AgentExecutionGate gate = AgentExecutionGate(gateAddress);
        AgentMandateRegistry registry = AgentMandateRegistry(registryAddress);
        RWAStateOracle oracle = RWAStateOracle(oracleAddress);
        TBillVault vault = TBillVault(vaultAddress);

        bytes4 depositSel = bytes4(keccak256("deposit(uint256,address)"));
        bytes4 redeemSel = bytes4(keccak256("redeem(uint256,address,address)"));
        bytes4 withdrawSel = bytes4(keccak256("withdraw(uint256,address,address)"));
        bytes4 allocateSel = bytes4(keccak256("allocate(uint256)"));

        vm.startBroadcast(deployerPrivateKey);

        // 1. Link Gate to Registry
        registry.setExecutionGate(gateAddress);
        console2.log("Registry linked to Gate.");

        // 2. Link Gate to Vault
        vault.setExecutionGate(gateAddress);
        console2.log("Vault linked to Gate.");

        // 3. Configure Oracle Asset
        oracle.addAsset(tokenAddress, 1 days);
        oracle.updateAssetState(tokenAddress, 1e18, true, 3);
        console2.log("Oracle configured with fresh NAV ($1.00) and open redemption.");

        // 4. Allowlist Selectors on Gate for Vault
        gate.setSelectorAllowed(vaultAddress, depositSel, true);
        gate.setSelectorAllowed(vaultAddress, redeemSel, true);
        gate.setSelectorAllowed(vaultAddress, withdrawSel, true);
        gate.setSelectorAllowed(vaultAddress, allocateSel, true);
        console2.log("Vault selectors allowlisted on Gate.");

        vm.stopBroadcast();
        console2.log("Configuration completed successfully!");
    }
}
