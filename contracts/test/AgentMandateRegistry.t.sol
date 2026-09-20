// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/Types.sol";
import "../src/IAgentMandateRegistry.sol";
import "../src/AgentMandateRegistry.sol";

// ============================================================
//  AgentMandateRegistry.t.sol
//
//  Test coverage per plan §14:
//
//  MANDATE TESTS:
//  [x] valid mandate
//  [x] invalid signature
//  [x] expired mandate
//  [x] not-yet-valid mandate
//  [x] revoked mandate
//  [x] wrong agent
//  [x] wrong target
//  [x] action not allowed
//  [x] maxTx exceeded
//  [x] cumulative exceeded
//  [x] nonce replay
//  [x] extend mandate
//
//  FUZZ / INVARIANT:
//  [x] used <= maxCumulative (invariant)
//  [x] revoked mandate can never execute (fuzz)
//  [x] expired mandate can never validate (fuzz)
// ============================================================

contract AgentMandateRegistryTest is Test {

    // ── Contracts ──────────────────────────────────────────
    AgentMandateRegistry public registry;

    // ── Test accounts ──────────────────────────────────────
    uint256 internal ownerPk   = 0xA11CE;
    uint256 internal agentPk   = 0xB0B;
    uint256 internal stranger  = 0xC0DE;

    address internal owner;
    address internal agent;
    address internal strangerAddr;

    // ── Fixed test parameters ──────────────────────────────
    address internal asset         = address(0x1111);
    address internal allowedTarget = address(0x2222);
    address internal mockGate      = address(0x9999);

    uint256 internal constant MASK_DEPOSIT  = Actions.DEPOSIT;
    uint256 internal constant MAX_TX        = 1_000e18;
    uint256 internal constant MAX_CUM       = 10_000e18;

    // -------------------------------------------------------
    // Setup
    // -------------------------------------------------------

    function setUp() public {
        owner        = vm.addr(ownerPk);
        agent        = vm.addr(agentPk);
        strangerAddr = vm.addr(stranger);

        registry = new AgentMandateRegistry(address(this));
        registry.setExecutionGate(mockGate);
    }

    // -------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------

    struct MandateParams {
        address agent;
        address asset;
        address allowedTarget;
        uint256 allowedActionsMask;
        uint256 maxTx;
        uint256 maxCumulative;
        uint256 validFrom;
        uint256 validUntil;
        uint256 ownerNonce;
    }

    function _defaultParams() internal view returns (MandateParams memory p) {
        p = MandateParams({
            agent:              agent,
            asset:              asset,
            allowedTarget:      allowedTarget,
            allowedActionsMask: MASK_DEPOSIT,
            maxTx:              MAX_TX,
            maxCumulative:      MAX_CUM,
            validFrom:          block.timestamp,
            validUntil:         block.timestamp + 7 days,
            ownerNonce:         registry.ownerNonce(owner)
        });
    }

    function _sign(MandateParams memory p, uint256 signerPk)
        internal
        view
        returns (bytes memory sig)
    {
        bytes32 structHash = keccak256(abi.encode(
            registry.GRANT_MANDATE_TYPEHASH(),
            p.agent,
            p.asset,
            p.allowedTarget,
            p.allowedActionsMask,
            p.maxTx,
            p.maxCumulative,
            p.validFrom,
            p.validUntil,
            p.ownerNonce
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            registry.DOMAIN_SEPARATOR(),
            structHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        sig = abi.encodePacked(r, s, v);
    }

    function _grantDefault() internal returns (bytes32 mandateId) {
        MandateParams memory p = _defaultParams();
        bytes memory sig = _sign(p, ownerPk);
        vm.prank(owner);
        mandateId = registry.grantMandate(
            p.agent, p.asset, p.allowedTarget,
            p.allowedActionsMask, p.maxTx, p.maxCumulative,
            p.validFrom, p.validUntil, p.ownerNonce, sig
        );
    }

    // -------------------------------------------------------
    // ── GRANT TESTS ─────────────────────────────────────────
    // -------------------------------------------------------

    function test_grantMandate_valid() public {
        bytes32 mid = _grantDefault();

        Mandate memory m = registry.getMandate(mid);
        assertEq(m.agent,              agent);
        assertEq(m.asset,              asset);
        assertEq(m.allowedTarget,      allowedTarget);
        assertEq(m.allowedActionsMask, MASK_DEPOSIT);
        assertEq(m.maxTx,              MAX_TX);
        assertEq(m.maxCumulative,      MAX_CUM);
        assertEq(m.used,               0);
        assertFalse(m.revoked);

        assertEq(registry.mandateOwner(mid), owner);
        // nonce was consumed
        assertEq(registry.ownerNonce(owner), 1);
    }

    function test_grantMandate_invalidSignature() public {
        MandateParams memory p = _defaultParams();
        // Sign with a wrong nonce so the recovered signer's nonce won't match
        // OR: sign with stranger key — recovered address will have nonce 0 but
        // we pass ownerNonce=1 which won't match. Force mismatch via bad nonce.
        p.ownerNonce = 99; // owner's real nonce is 0 — mismatch guaranteed
        bytes memory sig = _sign(p, ownerPk);
        vm.expectRevert(IAgentMandateRegistry.InvalidSignature.selector);
        registry.grantMandate(
            p.agent, p.asset, p.allowedTarget,
            p.allowedActionsMask, p.maxTx, p.maxCumulative,
            p.validFrom, p.validUntil, p.ownerNonce, sig
        );
    }

    function test_grantMandate_replayNonce() public {
        // Grant once (nonce 0 -> 1)
        _grantDefault();

        // Try to grant again with nonce=0 (already consumed) — should fail
        MandateParams memory p = _defaultParams();
        // ownerNonce field is 0 (from _defaultParams which reads registry.ownerNonce(owner)=1 now!)
        // Override to 0 to simulate replayed nonce
        p.ownerNonce = 0;
        bytes memory sig = _sign(p, ownerPk);
        vm.expectRevert(IAgentMandateRegistry.InvalidSignature.selector);
        registry.grantMandate(
            p.agent, p.asset, p.allowedTarget,
            p.allowedActionsMask, p.maxTx, p.maxCumulative,
            p.validFrom, p.validUntil, p.ownerNonce, sig
        );
    }

    function test_grantMandate_invalidParams_zeroAgent() public {
        MandateParams memory p = _defaultParams();
        p.agent = address(0);
        bytes memory sig = _sign(p, ownerPk);
        vm.expectRevert(IAgentMandateRegistry.InvalidMandateParams.selector);
        registry.grantMandate(
            p.agent, p.asset, p.allowedTarget,
            p.allowedActionsMask, p.maxTx, p.maxCumulative,
            p.validFrom, p.validUntil, p.ownerNonce, sig
        );
    }

    function test_grantMandate_invalidParams_expiredWindow() public {
        MandateParams memory p = _defaultParams();
        p.validUntil = block.timestamp - 1; // already in the past
        bytes memory sig = _sign(p, ownerPk);
        vm.expectRevert(IAgentMandateRegistry.InvalidMandateParams.selector);
        registry.grantMandate(
            p.agent, p.asset, p.allowedTarget,
            p.allowedActionsMask, p.maxTx, p.maxCumulative,
            p.validFrom, p.validUntil, p.ownerNonce, sig
        );
    }

    // -------------------------------------------------------
    // ── VALIDATE TESTS ──────────────────────────────────────
    // -------------------------------------------------------

    function test_validateMandate_valid() public {
        bytes32 mid = _grantDefault();
        // Should not revert
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, 500e18);
    }

    function test_validateMandate_mandateNotFound() public {
        bytes32 fakeMid = keccak256("nonexistent");
        vm.expectRevert(IAgentMandateRegistry.MandateNotFound.selector);
        registry.validateMandate(fakeMid, agent, allowedTarget, Actions.DEPOSIT, 100e18);
    }

    function test_validateMandate_notYetValid() public {
        // Create mandate that starts in the future
        MandateParams memory p = _defaultParams();
        p.validFrom  = block.timestamp + 1 days;
        p.validUntil = block.timestamp + 8 days;
        bytes memory sig = _sign(p, ownerPk);
        vm.prank(owner);
        bytes32 mid = registry.grantMandate(
            p.agent, p.asset, p.allowedTarget,
            p.allowedActionsMask, p.maxTx, p.maxCumulative,
            p.validFrom, p.validUntil, p.ownerNonce, sig
        );

        vm.expectRevert(IAgentMandateRegistry.MandateNotYetValid.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, 100e18);
    }

    function test_validateMandate_expired() public {
        bytes32 mid = _grantDefault();
        vm.warp(block.timestamp + 8 days); // past validUntil
        vm.expectRevert(IAgentMandateRegistry.MandateExpired.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, 100e18);
    }

    function test_validateMandate_revoked() public {
        bytes32 mid = _grantDefault();
        vm.prank(owner);
        registry.revokeMandate(mid);
        vm.expectRevert(IAgentMandateRegistry.MandateRevoked.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, 100e18);
    }

    function test_validateMandate_wrongAgent() public {
        bytes32 mid = _grantDefault();
        vm.expectRevert(IAgentMandateRegistry.CallerNotAgent.selector);
        registry.validateMandate(mid, strangerAddr, allowedTarget, Actions.DEPOSIT, 100e18);
    }

    function test_validateMandate_actionNotAllowed() public {
        bytes32 mid = _grantDefault(); // only DEPOSIT allowed
        vm.expectRevert(IAgentMandateRegistry.ActionNotAllowed.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.REDEEM, 100e18);
    }

    function test_validateMandate_targetNotAllowed() public {
        bytes32 mid = _grantDefault();
        address wrongTarget = address(0xDEAD);
        vm.expectRevert(IAgentMandateRegistry.TargetNotAllowed.selector);
        registry.validateMandate(mid, agent, wrongTarget, Actions.DEPOSIT, 100e18);
    }

    function test_validateMandate_txLimitExceeded() public {
        bytes32 mid = _grantDefault();
        vm.expectRevert(IAgentMandateRegistry.TxLimitExceeded.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, MAX_TX + 1);
    }

    function test_validateMandate_cumulativeLimitExceeded() public {
        bytes32 mid = _grantDefault();

        // Simulate the gate recording near-max usage
        vm.prank(mockGate);
        registry.recordUsage(mid, MAX_CUM - 100e18);

        // Now 100.01e18 would exceed cumulative
        vm.expectRevert(IAgentMandateRegistry.CumulativeLimitExceeded.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, 101e18);
    }

    // -------------------------------------------------------
    // ── REVOKE TESTS ────────────────────────────────────────
    // -------------------------------------------------------

    function test_revokeMandate_ownerCanRevoke() public {
        bytes32 mid = _grantDefault();
        vm.prank(owner);
        registry.revokeMandate(mid);
        assertTrue(registry.getMandate(mid).revoked);
    }

    function test_revokeMandate_strangerCannotRevoke() public {
        bytes32 mid = _grantDefault();
        vm.prank(strangerAddr);
        vm.expectRevert(IAgentMandateRegistry.NotMandateOwner.selector);
        registry.revokeMandate(mid);
    }

    // -------------------------------------------------------
    // ── EXTEND TESTS ────────────────────────────────────────
    // -------------------------------------------------------

    function test_extendMandate_ownerCanExtend() public {
        bytes32 mid = _grantDefault();
        uint256 newEnd = block.timestamp + 30 days;
        vm.prank(owner);
        registry.extendMandate(mid, newEnd);
        assertEq(registry.getMandate(mid).validUntil, newEnd);
    }

    function test_extendMandate_cannotShortenValidity() public {
        bytes32 mid = _grantDefault();
        uint256 shorterEnd = block.timestamp + 1 days; // less than current 7 days
        vm.prank(owner);
        vm.expectRevert("must extend");
        registry.extendMandate(mid, shorterEnd);
    }

    function test_extendMandate_cannotExtendRevoked() public {
        bytes32 mid = _grantDefault();
        vm.prank(owner);
        registry.revokeMandate(mid);
        vm.prank(owner);
        vm.expectRevert(IAgentMandateRegistry.MandateRevoked.selector);
        registry.extendMandate(mid, block.timestamp + 30 days);
    }

    function test_extendMandate_strangerCannotExtend() public {
        bytes32 mid = _grantDefault();
        vm.prank(strangerAddr);
        vm.expectRevert(IAgentMandateRegistry.NotMandateOwner.selector);
        registry.extendMandate(mid, block.timestamp + 30 days);
    }

    // -------------------------------------------------------
    // ── recordUsage TESTS ───────────────────────────────────
    // -------------------------------------------------------

    function test_recordUsage_gateCanRecord() public {
        bytes32 mid = _grantDefault();
        vm.prank(mockGate);
        registry.recordUsage(mid, 500e18);
        assertEq(registry.getMandate(mid).used, 500e18);
    }

    function test_recordUsage_nonGateReverts() public {
        bytes32 mid = _grantDefault();
        vm.prank(strangerAddr);
        vm.expectRevert("caller not gate");
        registry.recordUsage(mid, 500e18);
    }

    // -------------------------------------------------------
    // ── FUZZ TESTS ──────────────────────────────────────────
    // -------------------------------------------------------

    /// @dev Revoked mandates must NEVER pass validateMandate regardless of amount.
    function test_fuzz_revokedMandateNeverValidates(uint256 amount) public {
        amount = bound(amount, 1, MAX_TX);
        bytes32 mid = _grantDefault();
        vm.prank(owner);
        registry.revokeMandate(mid);
        vm.expectRevert(IAgentMandateRegistry.MandateRevoked.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, amount);
    }

    /// @dev Expired mandates must NEVER pass validateMandate.
    function test_fuzz_expiredMandateNeverValidates(uint256 warpSeconds) public {
        warpSeconds = bound(warpSeconds, 7 days + 1, 365 days);
        bytes32 mid = _grantDefault();
        vm.warp(block.timestamp + warpSeconds);
        vm.expectRevert(IAgentMandateRegistry.MandateExpired.selector);
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, 1e18);
    }

    /// @dev used can never exceed maxCumulative via legitimate recordUsage + validate flow.
    function test_fuzz_usedNeverExceedsCumulative(uint256 amount) public {
        amount = bound(amount, 1, MAX_TX);
        bytes32 mid = _grantDefault();

        // Record as much as we can without exceeding cumulative
        uint256 toRecord = amount <= MAX_CUM ? amount : MAX_CUM;
        vm.prank(mockGate);
        registry.recordUsage(mid, toRecord);

        uint256 remaining = MAX_CUM - registry.getMandate(mid).used;

        // Any amount that would exceed cumulative must revert
        if (amount > remaining) {
            vm.expectRevert(IAgentMandateRegistry.CumulativeLimitExceeded.selector);
        }
        // (if it doesn't exceed, validate should pass — just don't assert on it)
        registry.validateMandate(mid, agent, allowedTarget, Actions.DEPOSIT, amount);
    }
}

// -------------------------------------------------------
// ── INVARIANT TEST HARNESS ──────────────────────────────
// -------------------------------------------------------

contract MandateRegistryInvariantTest is Test {
    AgentMandateRegistry public registry;
    bytes32 public activeMandateId;

    uint256 internal ownerPk = 0xA11CE;
    address internal owner;
    address internal agent      = address(0xBEEF);
    address internal gateAddr   = address(0x9999);

    function setUp() public {
        owner    = vm.addr(ownerPk);
        registry = new AgentMandateRegistry(address(this));
        registry.setExecutionGate(gateAddr);

        // Grant one mandate for the invariant harness to work with
        uint256 validFrom  = block.timestamp;
        uint256 validUntil = block.timestamp + 365 days;
        uint256 nonce      = registry.ownerNonce(owner);

        bytes32 structHash = keccak256(abi.encode(
            registry.GRANT_MANDATE_TYPEHASH(),
            agent,
            address(0x1111),
            address(0x2222),
            Actions.DEPOSIT,
            uint256(1_000e18),
            uint256(10_000e18),
            validFrom,
            validUntil,
            nonce
        ));
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            registry.DOMAIN_SEPARATOR(),
            structHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        vm.prank(owner);
        activeMandateId = registry.grantMandate(
            agent,
            address(0x1111),
            address(0x2222),
            Actions.DEPOSIT,
            1_000e18,
            10_000e18,
            validFrom,
            validUntil,
            nonce,
            abi.encodePacked(r, s, v)
        );

        // Allow the invariant harness to call recordUsage
        targetSender(gateAddr);
    }

    /// @notice Invariant: used must never exceed maxCumulative.
    function invariant_usedNeverExceedsMaxCumulative() public view {
        Mandate memory m = registry.getMandate(activeMandateId);
        assertLe(m.used, m.maxCumulative, "used > maxCumulative");
    }
}
