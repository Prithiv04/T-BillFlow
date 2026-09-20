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
// Reentrancy Attacker Contract
// -------------------------------------------------------
contract ReentrantTarget {
    AgentExecutionGate public gate;
    ExecutionRequest public recursiveReq;
    bool public attacked;

    function setGateAndReq(AgentExecutionGate _gate, ExecutionRequest memory _req) external {
        gate = _gate;
        recursiveReq = _req;
    }

    function attack() external {
        if (!attacked) {
            attacked = true;
            gate.execute(recursiveReq);
        }
    }
}

// -------------------------------------------------------
// Mock Token
// -------------------------------------------------------
contract MockToken is ERC20 {
    constructor(string memory name, string memory sym) ERC20(name, sym) {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

// ============================================================
//  SecurityHardeningTest — Phase 5 Security Audit Suite
// ============================================================

contract SecurityHardeningTest is Test {
    MockToken public tokenA;
    MockToken public tokenB;
    TBillVault public vault;
    AgentExecutionGate public gate;
    AgentMandateRegistry public registry;
    RWAStateOracle public oracle;
    ReentrantTarget public reentrantTarget;

    uint256 internal userPk = 0xA11CE;
    address internal user;
    address internal admin = address(0xAD);
    address internal agent = address(0xBEEF);
    address internal attacker = address(0xDEAD);

    uint256 internal constant MAX_TX = 2_000e18;
    uint256 internal constant MAX_CUM = 5_000e18;
    uint256 internal constant MAX_NAV_AGE = 1 days;

    bytes4 internal depositSelector = bytes4(keccak256("deposit(uint256,address)"));
    bytes4 internal redeemSelector = bytes4(keccak256("redeem(uint256,address,address)"));
    bytes4 internal attackSelector = bytes4(keccak256("attack()"));

    bytes32 internal mandateTokenA;

    function setUp() public {
        user = vm.addr(userPk);

        // 1. Deploy tokens
        tokenA = new MockToken("Token A", "TKNA");
        tokenB = new MockToken("Token B", "TKNB");

        // 2. Deploy system
        registry = new AgentMandateRegistry(admin);
        oracle = new RWAStateOracle(admin);
        gate = new AgentExecutionGate(admin, address(registry), address(oracle));
        vault = new TBillVault(IERC20(address(tokenA)), "Vault TKNA", "vTKNA", admin);
        reentrantTarget = new ReentrantTarget();

        // 3. Link infrastructure
        vm.startPrank(admin);
        registry.setExecutionGate(address(gate));
        vault.setExecutionGate(address(gate));

        // Configure oracle for both tokens
        oracle.addAsset(address(tokenA), MAX_NAV_AGE);
        oracle.updateAssetState(address(tokenA), 1e18, true, 3);

        oracle.addAsset(address(tokenB), MAX_NAV_AGE);
        oracle.updateAssetState(address(tokenB), 1e18, true, 3);

        // Allowlist selectors
        gate.setSelectorAllowed(address(vault), depositSelector, true);
        gate.setSelectorAllowed(address(vault), redeemSelector, true);
        gate.setSelectorAllowed(address(reentrantTarget), attackSelector, true);
        vm.stopPrank();

        // 4. Fund user
        tokenA.mint(user, 100_000e18);
        vm.prank(user);
        tokenA.approve(address(vault), type(uint256).max);

        // 5. Grant mandate for tokenA
        mandateTokenA = _grantMandate(
            address(tokenA),
            address(vault),
            Actions.DEPOSIT | Actions.REDEEM,
            MAX_TX,
            MAX_CUM
        );
    }

    function _grantMandate(
        address asset,
        address target,
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
                asset,
                target,
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
            asset,
            target,
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
    // Security Test 1: Asset Substitution Attack
    // -------------------------------------------------------

    function test_security_assetSubstitution_blocked() public {
        // Mandate is for TokenA. Attacker tries to execute using TokenB in req.asset
        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenB), // substituted asset!
            action: Actions.DEPOSIT,
            amount: 500e18,
            target: address(vault),
            selector: depositSelector,
            callData: abi.encodeWithSelector(depositSelector, 500e18, user)
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed, "Asset substitution should be blocked");
        assertEq(bytes4(reason), IRWAStateOracle.AssetNotSupported.selector);

        vm.prank(agent);
        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Security Test 2: Reentrancy Protection
    // -------------------------------------------------------

    function test_security_reentrancy_blocked() public {
        // Create a mandate targeting reentrantTarget
        bytes32 attackMandate = _grantMandate(
            address(tokenA),
            address(reentrantTarget),
            Actions.DEPOSIT,
            MAX_TX,
            MAX_CUM
        );

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: attackMandate,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(reentrantTarget),
            selector: attackSelector,
            callData: abi.encodeWithSelector(attackSelector)
        });

        reentrantTarget.setGateAndReq(gate, req);

        // Attempt execution: reentrantTarget.attack() will re-enter gate.execute()
        // OpenZeppelin ReentrancyGuard should revert the reentrant call
        vm.prank(agent);
        vm.expectRevert();
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Security Test 3: Truncated Calldata & Selector Bypass
    // -------------------------------------------------------

    function test_security_truncatedCalldata_blocked() public {
        // calldata length < 4 bytes
        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(vault),
            selector: depositSelector,
            callData: hex"1234" // only 2 bytes
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IExecutionGate.SelectorNotAllowed.selector);

        vm.prank(agent);
        vm.expectRevert(IExecutionGate.SelectorNotAllowed.selector);
        gate.execute(req);
    }

    function test_security_mismatchedSelectorInCalldata_blocked() public {
        // Selector in req.selector is depositSelector, but calldata starts with redeemSelector
        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(vault),
            selector: depositSelector,
            callData: abi.encodeWithSelector(redeemSelector, 100e18, user, user)
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IExecutionGate.SelectorNotAllowed.selector);

        vm.prank(agent);
        vm.expectRevert(IExecutionGate.SelectorNotAllowed.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Security Test 4: Cumulative Limit Strict Invariant
    // -------------------------------------------------------

    function test_security_cumulativeLimit_strictInvariant() public {
        // Execute 2 transactions of 2,000e18 (total 4,000e18)
        bytes memory callData = abi.encodeWithSelector(depositSelector, 2_000e18, user);
        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 2_000e18,
            target: address(vault),
            selector: depositSelector,
            callData: callData
        });

        vm.startPrank(agent);
        gate.execute(req);
        gate.execute(req);
        vm.stopPrank();

        assertEq(registry.getMandate(mandateTokenA).used, 4_000e18);

        // Next 1,000e18 reaches exactly MAX_CUM (5,000e18)
        ExecutionRequest memory reqLast = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 1_000e18,
            target: address(vault),
            selector: depositSelector,
            callData: abi.encodeWithSelector(depositSelector, 1_000e18, user)
        });

        vm.prank(agent);
        gate.execute(reqLast);
        assertEq(registry.getMandate(mandateTokenA).used, MAX_CUM);

        // Attempting even 1 wei more must revert with CumulativeLimitExceeded
        ExecutionRequest memory reqOverflow = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 1,
            target: address(vault),
            selector: depositSelector,
            callData: abi.encodeWithSelector(depositSelector, 1, user)
        });

        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(reqOverflow);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.CumulativeLimitExceeded.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.CumulativeLimitExceeded.selector);
        gate.execute(reqOverflow);

        // Invariant check: used never exceeds maxCumulative
        assertLe(registry.getMandate(mandateTokenA).used, MAX_CUM);
    }

    // -------------------------------------------------------
    // Security Test 5: Revoked Mandate Immediate Invariant
    // -------------------------------------------------------

    function test_security_revokedMandate_immediateInvariant() public {
        // Revoke mandate
        vm.prank(user);
        registry.revokeMandate(mandateTokenA);

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: mandateTokenA,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(vault),
            selector: depositSelector,
            callData: abi.encodeWithSelector(depositSelector, 100e18, user)
        });

        // Immediately blocked
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.MandateRevoked.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.MandateRevoked.selector);
        gate.execute(req);
    }

    // -------------------------------------------------------
    // Security Test 6: Zero / Negative Time Window
    // -------------------------------------------------------

    function test_security_futureTimestamp_notYetValid() public {
        // Mandate valid only starting tomorrow
        uint256 validFrom = block.timestamp + 1 days;
        uint256 validUntil = block.timestamp + 30 days;
        uint256 nonce = registry.ownerNonce(user);

        bytes32 structHash = keccak256(
            abi.encode(
                registry.GRANT_MANDATE_TYPEHASH(),
                agent,
                address(tokenA),
                address(vault),
                Actions.DEPOSIT,
                MAX_TX,
                MAX_CUM,
                validFrom,
                validUntil,
                nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", registry.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);

        vm.prank(user);
        bytes32 futureMid = registry.grantMandate(
            agent,
            address(tokenA),
            address(vault),
            Actions.DEPOSIT,
            MAX_TX,
            MAX_CUM,
            validFrom,
            validUntil,
            nonce,
            abi.encodePacked(r, s, v)
        );

        ExecutionRequest memory req = ExecutionRequest({
            mandateId: futureMid,
            asset: address(tokenA),
            action: Actions.DEPOSIT,
            amount: 100e18,
            target: address(vault),
            selector: depositSelector,
            callData: abi.encodeWithSelector(depositSelector, 100e18, user)
        });

        // Currently before validFrom: reverts with MandateNotYetValid
        vm.prank(agent);
        (bool allowed, bytes memory reason) = gate.canExecute(req);
        assertFalse(allowed);
        assertEq(bytes4(reason), IAgentMandateRegistry.MandateNotYetValid.selector);

        vm.prank(agent);
        vm.expectRevert(IAgentMandateRegistry.MandateNotYetValid.selector);
        gate.execute(req);

        // Warp to validFrom: now allowed
        vm.warp(validFrom);
        vm.prank(agent);
        (bool allowedNow, ) = gate.canExecute(req);
        assertTrue(allowedNow);
    }

    // -------------------------------------------------------
    // Security Test 7: Direct Attacker Cannot Exploit Vault
    // -------------------------------------------------------

    function test_security_attackerCannotBypassVaultAllowance() public {
        // Attacker calls vault.redeem attempting to steal user's shares
        vm.prank(user);
        vault.deposit(1_000e18, user);

        // Attacker directly calls redeem for user's shares
        vm.prank(attacker);
        vm.expectRevert();
        vault.redeem(1_000e18, attacker, user);

        // Attacker directly calls withdraw
        vm.prank(attacker);
        vm.expectRevert();
        vault.withdraw(1_000e18, attacker, user);
    }
}
