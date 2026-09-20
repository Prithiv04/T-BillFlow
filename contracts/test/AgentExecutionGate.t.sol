// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AgentExecutionGate} from "../src/AgentExecutionGate.sol";
import {AgentMandateRegistry} from "../src/AgentMandateRegistry.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {IExecutionGate} from "../src/IExecutionGate.sol";
import {IAgentMandateRegistry} from "../src/IAgentMandateRegistry.sol";
import {IRWAStateOracle} from "../src/IRWAStateOracle.sol";
import {ExecutionRequest, Actions, ActionMask} from "../src/Types.sol";

// -------------------------------------------------------
// Mock Target Contract for testing call forwarding
// -------------------------------------------------------
contract MockTarget {
    uint256 public totalDeposited;
    uint256 public totalRedeemed;

    event Deposited(address sender, uint256 amount);
    event Redeemed(address sender, uint256 amount);

    function deposit(uint256 amount) external {
        totalDeposited += amount;
        emit Deposited(msg.sender, amount);
    }

    function redeem(uint256 amount) external {
        totalRedeemed += amount;
        emit Redeemed(msg.sender, amount);
    }

    function failingCall() external pure {
        revert("mock target failure");
    }
}

// ============================================================
//  AgentExecutionGateTest — Phase 3 Test Suite
// ============================================================

contract AgentExecutionGateTest is Test {
    AgentExecutionGate public gate;
    AgentMandateRegistry public registry;
    RWAStateOracle public oracle;
    MockTarget public target;

    uint256 internal ownerPk = 0xA11CE;
    address internal owner;
    address internal gateAdmin = address(0xAD);
    address internal agent = address(0xBEEF);
    address internal stranger = address(0xCAFE);
    address internal mockAsset = address(0x1111);

    bytes32 internal defaultMandateId;
    bytes4 internal depositSelector = MockTarget.deposit.selector;
    bytes4 internal redeemSelector = MockTarget.redeem.selector;

    uint256 internal constant MAX_TX = 1_000e18;
    uint256 internal constant MAX_CUM = 10_000e18;
    uint256 internal constant DEFAULT_MAX_NAV_AGE = 1 days;

    function setUp() public {
        owner = vm.addr(ownerPk);

        // 1. Deploy contracts
        registry = new AgentMandateRegistry(gateAdmin);
        oracle = new RWAStateOracle(gateAdmin);
        gate = new AgentExecutionGate(
            gateAdmin,
            address(registry),
            address(oracle)
        );
        target = new MockTarget();

        // 2. Configure registry execution gate
        vm.prank(gateAdmin);
        registry.setExecutionGate(address(gate));

        // 3. Configure oracle with asset
        vm.startPrank(gateAdmin);
        oracle.addAsset(mockAsset, DEFAULT_MAX_NAV_AGE);
        oracle.updateAssetState(mockAsset, 1e18, true, 3);
        // Allowlist deposit & redeem selectors on target
        gate.setSelectorAllowed(address(target), depositSelector, true);
        gate.setSelectorAllowed(address(target), redeemSelector, true);
        vm.stopPrank();

        // 4. Grant a default mandate allowing DEPOSIT | REDEEM
        defaultMandateId = _grantMandate(
            Actions.DEPOSIT | Actions.REDEEM,
            MAX_TX,
            MAX_CUM
        );
    }

    // -------------------------------------------------------
    // Helper: EIP-712 Mandate Signing & Granting
    // -------------------------------------------------------

    function _grantMandate(
        uint256 allowedActionsMask,
        uint256 maxTx,
        uint256 maxCumulative
    ) internal returns (bytes32) {
        uint256 validFrom = block.timestamp;
        uint256 validUntil = block.timestamp + 30 days;
        uint256 nonce = registry.ownerNonce(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                registry.GRANT_MANDATE_TYPEHASH(),
                agent,
                mockAsset,
                address(target),
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
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        vm.prank(owner);
        return registry.grantMandate(
            agent,
            mockAsset,
            address(target),
            allowedActionsMask,
            maxTx,
            maxCumulative,
            validFrom,
            validUntil,
            nonce,
            abi.encodePacked(r, s, v)
        );
    }

    function _buildRequest(
        bytes32 mandateId,
        uint256 action,
        uint256 amount,
        bytes4 selector,
        bytes memory callData
    ) internal view returns (ExecutionRequest memory) {
        return ExecutionRequest({
            mandateId: mandateId,
            asset: mockAsset,
            action: action,
            amount: amount,
            target: address(target),
            selector: selector,
            callData: callData
        });
    }

    // -------------------------------------------------------
    // Core Execution Tests
    // -------------------------------------------------------

    function test_validExecution_deposit() public {
        uint256 amount = 500e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount);
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            callData
        );

        // Simulation passes
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertTrue(allowed, "canExecute should allow");
        assertEq(reason.length, 0, "reason should be empty");

        // Execute passes
        vm.prank(agent);
        gate.execute(req);

        // Verify target state
        assertEq(target.totalDeposited(), amount, "MockTarget not updated");

        // Verify cumulative usage tracked in registry
        assertEq(registry.getMandate(defaultMandateId).used, amount, "Usage not tracked");
    }

    function test_validExecution_multipleCumulative() public {
        uint256 amount = 300e18;
        bytes memory callData = abi.encodeWithSelector(depositSelector, amount);
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            callData
        );

        vm.startPrank(agent);
        gate.execute(req);
        gate.execute(req);
        vm.stopPrank();

        assertEq(target.totalDeposited(), 600e18);
        assertEq(registry.getMandate(defaultMandateId).used, 600e18);
    }

    // -------------------------------------------------------
    // Selector Allowlist Tests
    // -------------------------------------------------------

    function test_unauthorizedSelector_reverts() public {
        bytes4 unauthorized = bytes4(keccak256("unauthorizedMethod()"));
        bytes memory callData = abi.encodeWithSelector(unauthorized);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: defaultMandateId,
            asset: mockAsset,
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(target),
            selector: unauthorized,
            callData: callData
        });

        // canExecute returns false + SelectorNotAllowed selector
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IExecutionGate.SelectorNotAllowed.selector);

        // execute reverts
        vm.prank(agent);
        vm.expectRevert(IExecutionGate.SelectorNotAllowed.selector);
        gate.execute(req);
    }

    function test_selectorCalldataMismatch_reverts() public {
        // Selector in req is depositSelector, but callData encodes redeemSelector
        bytes memory mismatchedCallData = abi.encodeWithSelector(redeemSelector, 100e18);

        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            100e18,
            depositSelector,
            mismatchedCallData
        );

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IExecutionGate.SelectorNotAllowed.selector);

        vm.prank(agent);
        vm.expectRevert(IExecutionGate.SelectorNotAllowed.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Target Restriction Tests
    // -------------------------------------------------------

    function test_unauthorizedTarget_reverts() public {
        address wrongTarget = address(0x8888);
        bytes memory callData = abi.encodeWithSelector(depositSelector, 100e18);

        // Allowlist selector on wrong target
        vm.prank(gateAdmin);
        gate.setSelectorAllowed(wrongTarget, depositSelector, true);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: defaultMandateId,
            asset: mockAsset,
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: wrongTarget,
            selector: depositSelector,
            callData: callData
        });

        // Reverts with TargetNotAllowed from registry
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.TargetNotAllowed.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.TargetNotAllowed.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Emergency Pause Tests
    // -------------------------------------------------------

    function test_pausedGate_blocksExecution() public {
        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        // Pause gate
        vm.prank(gateAdmin);
        gate.pause();
        assertTrue(gate.paused());

        // canExecute returns false + GatePaused
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IExecutionGate.GatePaused.selector);

        // execute reverts
        vm.prank(agent);
        vm.expectRevert(IExecutionGate.GatePaused.selector);
        gate.execute(req);

        // Unpause restores execution
        vm.prank(gateAdmin);
        gate.unpause();
        assertFalse(gate.paused());

        vm.prank(agent);
        gate.execute(req);
        assertEq(target.totalDeposited(), amount);
    }

    // -------------------------------------------------------
    // Oracle Integration Tests (Stale NAV, Redemption)
    // -------------------------------------------------------

    function test_staleNAV_blocksExecution() public {
        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        // Warp past max NAV age
        vm.warp(block.timestamp + DEFAULT_MAX_NAV_AGE + 1);

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IRWAStateOracle.NavStale.selector);

        vm.prank(agent);
        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        gate.execute(req);
    }

    function test_redemptionClosed_blocksRedeem() public {
        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.REDEEM,
            amount,
            redeemSelector,
            abi.encodeWithSelector(redeemSelector, amount)
        );

        // Close redemption in oracle
        vm.prank(gateAdmin);
        oracle.setRedemptionOpen(mockAsset, false);

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IRWAStateOracle.RedemptionClosed.selector);

        vm.prank(agent);
        vm.expectRevert(IRWAStateOracle.RedemptionClosed.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Mandate Limits Tests
    // -------------------------------------------------------

    function test_cumulativeCap_cannotBeExceeded() public {
        bytes32 mid = _grantMandate(Actions.DEPOSIT, 10_000e18, 10_000e18);
        uint256 amount = 6_000e18;
        ExecutionRequest memory req = _buildRequest(
            mid,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        // First 6,000 passes
        vm.prank(agent);
        gate.execute(req);

        // Second 6,000 exceeds 10,000 cumulative cap
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.CumulativeLimitExceeded.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.CumulativeLimitExceeded.selector);
        gate.execute(req);
    }

    function test_maxTx_cannotBeExceeded() public {
        // MAX_TX is 1,000e18; attempt 1,001e18
        uint256 amount = MAX_TX + 1;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.TxLimitExceeded.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.TxLimitExceeded.selector);
        gate.execute(req);
    }

    function test_revokedMandate_cannotExecute() public {
        vm.prank(owner);
        registry.revokeMandate(defaultMandateId);

        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.MandateRevoked.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.MandateRevoked.selector);
        gate.execute(req);
    }

    function test_expiredMandate_cannotExecute() public {
        vm.warp(block.timestamp + 31 days);

        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.MandateExpired.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.MandateExpired.selector);
        gate.execute(req);
    }

    function test_stranger_cannotExecute() public {
        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        vm.prank(stranger);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.CallerNotAgent.selector);

        vm.prank(stranger);
        vm.expectRevert(IAgentMandateRegistry.CallerNotAgent.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Target Revert Bubbling
    // -------------------------------------------------------

    function test_targetRevert_bubblesUp() public {
        bytes4 failSel = MockTarget.failingCall.selector;
        vm.prank(gateAdmin);
        gate.setSelectorAllowed(address(target), failSel, true);

        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            0,
            failSel,
            abi.encodeWithSelector(failSel)
        );

        vm.prank(agent);
        vm.expectRevert("mock target failure");
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Admin Access Control Tests
    // -------------------------------------------------------

    function test_admin_onlyOwnerCanConfigure() public {
        vm.startPrank(stranger);

        vm.expectRevert();
        gate.setSelectorAllowed(address(target), depositSelector, false);

        vm.expectRevert();
        gate.pause();

        vm.expectRevert();
        gate.unpause();

        vm.stopPrank();
    }

    // -------------------------------------------------------
    // Fuzz Tests
    // -------------------------------------------------------

    /// @dev Any unallowlisted selector must always revert with SelectorNotAllowed.
    function test_fuzz_unauthorizedSelectorReverts(bytes4 randSel) public {
        vm.assume(randSel != depositSelector && randSel != redeemSelector);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: defaultMandateId,
            asset: mockAsset,
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(target),
            selector: randSel,
            callData: abi.encodeWithSelector(randSel)
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IExecutionGate.SelectorNotAllowed.selector);

        vm.prank(agent);
        vm.expectRevert(IExecutionGate.SelectorNotAllowed.selector);
        gate.execute(req);
    }

    /// @dev Stale NAV must block execution regardless of elapsed time.
    function test_fuzz_staleNavBlocksExecution(uint256 warpExtra) public {
        warpExtra = bound(warpExtra, 1, 28 days);
        vm.warp(block.timestamp + DEFAULT_MAX_NAV_AGE + warpExtra);

        uint256 amount = 100e18;
        ExecutionRequest memory req = _buildRequest(
            defaultMandateId,
            Actions.DEPOSIT,
            amount,
            depositSelector,
            abi.encodeWithSelector(depositSelector, amount)
        );

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IRWAStateOracle.NavStale.selector);

        vm.prank(agent);
        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        gate.execute(req);
    }
}
