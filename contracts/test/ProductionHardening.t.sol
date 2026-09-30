// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {IRWAStateOracle} from "../src/IRWAStateOracle.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";
import {IComplianceRegistry} from "../src/IComplianceRegistry.sol";
import {RWAAssetRegistry} from "../src/RWAAssetRegistry.sol";
import {TBillVault} from "../src/TBillVault.sol";
import {ExecutionRequest, Actions} from "../src/Types.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ProductionHardeningTest is Test {
    using ECDSA for bytes32;

    RWAStateOracle public oracle;
    AgentMandateRegistry public registry;
    AgentExecutionGate public gate;
    ComplianceRegistry public compliance;
    RWAAssetRegistry public assetRegistry;
    TBillVault public vault;
    MockUSDC public usdc;

    uint256 internal ownerPk = 0xA11CE;
    address internal owner;

    uint256 internal providerPk = 0xB0B;
    address internal provider;

    uint256 internal agentPk = 0xCAFE;
    address internal agent;

    uint256 internal unverifiedUserPk = 0xDEAD;
    address internal unverifiedUser;

    uint256 internal verifiedUserPk = 0xBEEF;
    address internal verifiedUser;

    bytes4 internal depositSelector = bytes4(keccak256("deposit(uint256,address)"));
    bytes32 internal mandateId;

    function setUp() public {
        owner = vm.addr(ownerPk);
        provider = vm.addr(providerPk);
        agent = vm.addr(agentPk);
        unverifiedUser = vm.addr(unverifiedUserPk);
        verifiedUser = vm.addr(verifiedUserPk);

        vm.startPrank(owner);

        usdc = new MockUSDC();
        oracle = new RWAStateOracle(owner);
        registry = new AgentMandateRegistry(owner);
        gate = new AgentExecutionGate(owner, address(registry), address(oracle));
        compliance = new ComplianceRegistry(owner);
        assetRegistry = new RWAAssetRegistry(owner);
        vault = new TBillVault(usdc, "TBillFlow Share", "tbUSD", owner);

        vault.setExecutionGate(address(gate));
        registry.setExecutionGate(address(gate));
        gate.setSelectorAllowed(address(vault), depositSelector, true);
        gate.setComplianceRegistry(address(compliance));

        // Setup asset in oracle
        oracle.addAsset(address(usdc), 3600);
        oracle.updateAssetState(address(usdc), 1e18, true, 2);

        // Authorize provider
        oracle.setApprovedProvider(provider, true);

        // Configure verified user in compliance registry
        compliance.setJurisdictionPolicy(840, true);
        compliance.setKYCStatus(verifiedUser, true, 840); // 840 = US

        // Grant mandate for verified user
        vm.stopPrank();

        // Sign mandate as verifiedUser
        vm.prank(owner);
        usdc.mint(verifiedUser, 100_000e18);

        vm.prank(verifiedUser);
        usdc.approve(address(vault), type(uint256).max);

        // Setup mandate
        bytes32 structHash = keccak256(
            abi.encode(
                registry.GRANT_MANDATE_TYPEHASH(),
                agent,
                address(usdc),
                address(vault),
                Actions.DEPOSIT,
                10_000e18,
                50_000e18,
                block.timestamp,
                block.timestamp + 30 days,
                0
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", registry.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifiedUserPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        mandateId = registry.grantMandate(
            agent,
            address(usdc),
            address(vault),
            Actions.DEPOSIT,
            10_000e18,
            50_000e18,
            block.timestamp,
            block.timestamp + 30 days,
            0,
            sig
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Oracle Attestation & Trusted Provider Tests
    // ─────────────────────────────────────────────────────────────

    function test_provider_canUpdateAssetStateDirectly() public {
        vm.prank(provider);
        oracle.updateAssetState(address(usdc), 1.05e18, true, 3);

        assertEq(oracle.nav(address(usdc)), 1.05e18);
        IRWAStateOracle.AssetState memory state = oracle.getAssetState(address(usdc));
        assertEq(state.liquidityTier, 3);
    }

    function test_unauthorizedProvider_cannotUpdateAssetState() public {
        address stranger = address(0x999);
        vm.prank(stranger);
        vm.expectRevert(IRWAStateOracle.UnauthorizedProvider.selector);
        oracle.updateAssetState(address(usdc), 1.05e18, true, 3);
    }

    function test_eip712_attestationUpdate() public {
        uint256 nav = 1.025e18;
        uint256 navTime = block.timestamp;
        uint256 deadline = block.timestamp + 600;
        uint256 nonce = 1;

        IRWAStateOracle.RWAAttestation memory attestation = IRWAStateOracle.RWAAttestation({
            asset: address(usdc),
            nav: nav,
            navTimestamp: navTime,
            redemptionOpen: true,
            liquidityTier: 3,
            nonce: nonce,
            deadline: deadline
        });

        bytes32 structHash = keccak256(
            abi.encode(
                oracle.ATTESTATION_TYPEHASH(),
                attestation.asset,
                attestation.nav,
                attestation.navTimestamp,
                attestation.redemptionOpen,
                attestation.liquidityTier,
                attestation.nonce,
                attestation.deadline
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TBillFlow-RWA-Oracle")),
                keccak256(bytes("1")),
                block.chainid,
                address(oracle)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(providerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Warp 1 second to advance from setup timestamp
        vm.warp(block.timestamp + 10);
        attestation.navTimestamp = block.timestamp;

        // Recompute digest for new timestamp
        structHash = keccak256(
            abi.encode(
                oracle.ATTESTATION_TYPEHASH(),
                attestation.asset,
                attestation.nav,
                attestation.navTimestamp,
                attestation.redemptionOpen,
                attestation.liquidityTier,
                attestation.nonce,
                attestation.deadline
            )
        );
        digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (v, r, s) = vm.sign(providerPk, digest);
        sig = abi.encodePacked(r, s, v);

        // Stranger relays the valid signed attestation
        vm.prank(address(0x123));
        oracle.updateAssetStateWithAttestation(attestation, sig);

        assertEq(oracle.nav(address(usdc)), nav);
    }

    function test_attestation_replayBlocked() public {
        uint256 nav = 1.03e18;
        vm.warp(block.timestamp + 10);
        uint256 navTime = block.timestamp;
        uint256 deadline = block.timestamp + 600;

        IRWAStateOracle.RWAAttestation memory attestation = IRWAStateOracle.RWAAttestation({
            asset: address(usdc),
            nav: nav,
            navTimestamp: navTime,
            redemptionOpen: true,
            liquidityTier: 3,
            nonce: 2,
            deadline: deadline
        });

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TBillFlow-RWA-Oracle")),
                keccak256(bytes("1")),
                block.chainid,
                address(oracle)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                oracle.ATTESTATION_TYPEHASH(),
                attestation.asset,
                attestation.nav,
                attestation.navTimestamp,
                attestation.redemptionOpen,
                attestation.liquidityTier,
                attestation.nonce,
                attestation.deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(providerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        oracle.updateAssetStateWithAttestation(attestation, sig);

        // Second submission must revert with AttestationAlreadyUsed
        vm.expectRevert(IRWAStateOracle.AttestationAlreadyUsed.selector);
        oracle.updateAssetStateWithAttestation(attestation, sig);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Compliance, KYC & Transfer Policy Tests
    // ─────────────────────────────────────────────────────────────

    function test_compliance_verifiedUserCanExecute() public {
        uint256 amount = 1_000e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount, verifiedUser);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.DEPOSIT,
            amount: amount,
            target: address(vault),
            selector: depositSelector,
            callData: callData
        });

        vm.prank(agent);
        (bool allowed, ) = gate.canExecute(req);
        assertTrue(allowed);

        vm.prank(agent);
        gate.execute(req);
    }

    function test_compliance_sanctionedUserBlocked() public {
        // Sanction verified user
        vm.prank(owner);
        compliance.setSanctionStatus(verifiedUser, true);

        uint256 amount = 1_000e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount, verifiedUser);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.DEPOSIT,
            amount: amount,
            target: address(vault),
            selector: depositSelector,
            callData: callData
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IComplianceRegistry.WalletSanctioned.selector);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(IComplianceRegistry.WalletSanctioned.selector, verifiedUser)
        );
        gate.execute(req);
    }

    function test_compliance_unverifiedUserBlocked() public {
        // Revoke KYC
        vm.prank(owner);
        compliance.setKYCStatus(verifiedUser, false, 840);

        uint256 amount = 1_000e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount, verifiedUser);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.DEPOSIT,
            amount: amount,
            target: address(vault),
            selector: depositSelector,
            callData: callData
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IComplianceRegistry.InvestorNotKYCApproved.selector);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Asset Registry Configuration Tests
    // ─────────────────────────────────────────────────────────────

    function test_assetRegistry_configuration() public {
        address usdy = address(0x1111);
        vm.prank(owner);
        assetRegistry.configureAsset(
            usdy,
            address(usdc),
            6,
            18,
            100e6,
            true,
            "Coinbase Prime"
        );

        assertTrue(assetRegistry.isAssetActive(usdy));
        RWAAssetRegistry.AssetMetadata memory meta = assetRegistry.getAsset(usdy);
        assertEq(meta.settlementToken, address(usdc));
        assertEq(meta.custodianName, "Coinbase Prime");
    }
}
