// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {TBillVault} from "../src/TBillVault.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {ExecutionRequest, Actions, ActionMask} from "../src/Types.sol";
import {IExecutionGate} from "../src/IExecutionGate.sol";
import {IAgentMandateRegistry} from "../src/IAgentMandateRegistry.sol";
import {IRWAStateOracle} from "../src/IRWAStateOracle.sol";

// -------------------------------------------------------
// Mock ERC20 Token (Mock USDC)
// -------------------------------------------------------
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ============================================================
//  TBillVaultTest — Phase 4 Test Suite
// ============================================================

contract TBillVaultTest is Test {
    MockUSDC public usdc;
    TBillVault public vault;
    AgentExecutionGate public gate;
    AgentMandateRegistry public registry;
    RWAStateOracle public oracle;

    uint256 internal userPk = 0xA11CE;
    address internal user;
    address internal admin = address(0xAD);
    address internal agent = address(0xBEEF);
    address internal stranger = address(0xCAFE);

    uint256 internal constant MAX_TX = 5_000e18;
    uint256 internal constant MAX_CUM = 20_000e18;
    uint256 internal constant INITIAL_DEPOSIT = 10_000e18;

    bytes4 internal depositSelector = bytes4(keccak256("deposit(uint256,address)"));
    bytes4 internal redeemSelector = bytes4(keccak256("redeem(uint256,address,address)"));
    bytes4 internal allocateSelector = bytes4(keccak256("allocate(uint256)"));

    bytes32 internal mandateId;

    function setUp() public {
        user = vm.addr(userPk);

        // 1. Deploy underlying mock token
        usdc = new MockUSDC();

        // 2. Deploy infrastructure
        registry = new AgentMandateRegistry(admin);
        oracle = new RWAStateOracle(admin);
        gate = new AgentExecutionGate(admin, address(registry), address(oracle));
        vault = new TBillVault(IERC20(address(usdc)), "T-BillFlow Shares", "tbUSD", admin);

        // 3. Link gate to registry and vault
        vm.startPrank(admin);
        registry.setExecutionGate(address(gate));
        vault.setExecutionGate(address(gate));

        // Configure oracle for the mock asset
        oracle.addAsset(address(usdc), 1 days);
        oracle.updateAssetState(address(usdc), 1e18, true, 3); // fresh NAV, redemption open, tier 3

        // Allowlist selectors on the vault
        gate.setSelectorAllowed(address(vault), depositSelector, true);
        gate.setSelectorAllowed(address(vault), redeemSelector, true);
        gate.setSelectorAllowed(address(vault), allocateSelector, true);
        vm.stopPrank();

        // 4. Fund user with USDC and approve vault
        usdc.mint(user, 100_000e18);
        vm.prank(user);
        usdc.approve(address(vault), type(uint256).max);

        // 5. Grant agent mandate from user
        mandateId = _grantMandate(
            Actions.DEPOSIT | Actions.REDEEM | Actions.ALLOCATE,
            MAX_TX,
            MAX_CUM
        );
    }

    // -------------------------------------------------------
    // Helper: Grant Mandate
    // -------------------------------------------------------

    function _grantMandate(
        uint256 allowedActionsMask,
        uint256 maxTx,
        uint256 maxCumulative
    ) internal returns (bytes32) {
        uint256 validFrom = block.timestamp;
        uint256 validUntil = block.timestamp + 30 days;
        uint256 nonce = registry.ownerNonce(user);

        bytes32 structHash = keccak256(
            abi.encode(
                registry.GRANT_MANDATE_TYPEHASH(),
                agent,
                address(usdc),
                address(vault),
                allowedActionsMask,
                maxTx,
                maxCumulative,
                validFrom,
                validUntil,
                nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", registry.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);

        vm.prank(user);
        return registry.grantMandate(
            agent,
            address(usdc),
            address(vault),
            allowedActionsMask,
            maxTx,
            maxCumulative,
            validFrom,
            validUntil,
            nonce,
            abi.encodePacked(r, s, v)
        );
    }

    // -------------------------------------------------------
    // Standard Direct ERC-4626 Tests
    // -------------------------------------------------------

    function test_direct_depositAndRedeem() public {
        uint256 amount = 1_000e18;

        // User directly deposits
        vm.prank(user);
        uint256 shares = vault.deposit(amount, user);

        assertEq(shares, amount, "1:1 initial share ratio");
        assertEq(vault.balanceOf(user), shares);
        assertEq(vault.totalAssets(), amount);

        // User directly redeems
        vm.prank(user);
        uint256 returnedAssets = vault.redeem(shares, user, user);

        assertEq(returnedAssets, amount);
        assertEq(vault.balanceOf(user), 0);
        assertEq(vault.totalAssets(), 0);
    }

    // -------------------------------------------------------
    // Gate-Mediated Deposit Tests
    // -------------------------------------------------------

    function test_gate_mediatedDeposit() public {
        uint256 amount = 2_000e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount, user);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.DEPOSIT,
            amount: amount,
            target: address(vault),
            selector: depositSelector,
            callData: callData
        });

        // Agent simulates execution
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertTrue(allowed, "canExecute should return true");
        assertEq(reason.length, 0);

        // Agent executes through Gate
        vm.prank(agent);
        gate.execute(req);

        // Verify shares were minted to user
        assertEq(vault.balanceOf(user), amount);
        assertEq(vault.totalAssets(), amount);

        // Verify cumulative usage tracked in registry
        assertEq(registry.getMandate(mandateId).used, amount);
    }

    // -------------------------------------------------------
    // Gate-Mediated Redeem Tests
    // -------------------------------------------------------

    function test_gate_mediatedRedeem() public {
        // Initial deposit by user
        vm.prank(user);
        uint256 shares = vault.deposit(3_000e18, user);

        uint256 redeemShares = 1_000e18;
        bytes memory callData = abi.encodeWithSelector(redeemSelector, redeemShares, user, user);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.REDEEM,
            amount: redeemShares,
            target: address(vault),
            selector: redeemSelector,
            callData: callData
        });

        // Execute redemption through Gate
        uint256 usdcBefore = usdc.balanceOf(user);
        vm.prank(agent);
        gate.execute(req);

        assertEq(vault.balanceOf(user), shares - redeemShares);
        assertEq(usdc.balanceOf(user), usdcBefore + redeemShares);
        assertEq(registry.getMandate(mandateId).used, redeemShares);
    }

    // -------------------------------------------------------
    // Gate-Mediated Allocation Tests
    // -------------------------------------------------------

    function test_gate_mediatedAllocate() public {
        uint256 amount = 500e18;
        bytes memory callData = abi.encodeWithSelector(allocateSelector, amount);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.ALLOCATE,
            amount: amount,
            target: address(vault),
            selector: allocateSelector,
            callData: callData
        });

        vm.prank(agent);
        gate.execute(req);

        assertEq(registry.getMandate(mandateId).used, amount);
    }

    function test_direct_allocate_onlyAuthorized() public {
        // Stranger cannot allocate
        vm.prank(stranger);
        vm.expectRevert("not authorized to allocate");
        vault.allocate(100e18);

        // Owner can allocate
        vm.prank(admin);
        vault.allocate(100e18);
    }

    // -------------------------------------------------------
    // Gate + Oracle Policy Enforcement on Vault
    // -------------------------------------------------------

    function test_vault_staleNavBlocksDeposit() public {
        // Warp past max NAV age
        vm.warp(block.timestamp + 1 days + 1);

        uint256 amount = 1_000e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount, user);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.DEPOSIT,
            amount: amount,
            target: address(vault),
            selector: depositSelector,
            callData: callData
        });

        // Gate blocks execution due to stale NAV
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IRWAStateOracle.NavStale.selector);

        vm.prank(agent);
        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        gate.execute(req);
    }

    function test_vault_closedRedemptionBlocksRedeem() public {
        // Initial deposit
        vm.prank(user);
        vault.deposit(2_000e18, user);

        // Close redemption in oracle
        vm.prank(admin);
        oracle.setRedemptionOpen(address(usdc), false);

        bytes memory callData = abi.encodeWithSelector(redeemSelector, 1_000e18, user, user);
        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateId,
            asset: address(usdc),
            action: Actions.REDEEM,
            amount: 1_000e18,
            target: address(vault),
            selector: redeemSelector,
            callData: callData
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IRWAStateOracle.RedemptionClosed.selector);

        vm.prank(agent);
        vm.expectRevert(IRWAStateOracle.RedemptionClosed.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Admin Controls
    // -------------------------------------------------------

    function test_vault_setExecutionGate_accessControl() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.setExecutionGate(address(0x123));

        vm.prank(admin);
        vault.setExecutionGate(address(0x123));
        assertEq(vault.executionGate(), address(0x123));
    }
}
