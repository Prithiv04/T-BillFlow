// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {IRWAStateOracle} from "../src/IRWAStateOracle.sol";
import {Actions, ActionMask} from "../src/Types.sol";

// ============================================================
//  RWAStateOracleTest — Phase 2 Test Suite
// ============================================================

contract RWAStateOracleTest is Test {
    RWAStateOracle public oracle;

    address internal owner = address(0xAAAA);
    address internal stranger = address(0xBBBB);
    address internal mockAsset = address(0x1111);
    address internal unaddedAsset = address(0x9999);

    uint256 internal constant DEFAULT_MAX_NAV_AGE = 1 days;
    uint256 internal constant INITIAL_NAV = 1.05e18; // $1.05 per share

    function setUp() public {
        vm.prank(owner);
        oracle = new RWAStateOracle(owner);

        // Register default mock asset
        vm.prank(owner);
        oracle.addAsset(mockAsset, DEFAULT_MAX_NAV_AGE);

        // Set healthy initial state: NAV fresh, redemption open, high liquidity (tier 3)
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 3);
    }

    // -------------------------------------------------------
    // Asset Support Tests
    // -------------------------------------------------------

    function test_supportedAsset() public view {
        IRWAStateOracle.AssetState memory s = oracle.getAssetState(mockAsset);
        assertTrue(s.supported, "Asset should be supported");
        assertEq(s.maxNavAge, DEFAULT_MAX_NAV_AGE, "maxNavAge mismatch");
        assertEq(s.nav, INITIAL_NAV, "NAV mismatch");
        assertTrue(s.redemptionOpen, "Redemption should be open");
        assertEq(s.liquidityTier, 3, "Liquidity tier mismatch");
    }

    function test_unsupportedAsset_reverts() public {
        // Querying nav() on unsupported asset reverts
        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        oracle.nav(unaddedAsset);

        // isNavFresh() returns false
        assertFalse(oracle.isNavFresh(unaddedAsset));

        // isRedemptionOpen() returns false
        assertFalse(oracle.isRedemptionOpen(unaddedAsset));

        // isEligible() reverts with AssetNotSupported
        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        oracle.isEligible(unaddedAsset, Actions.DEPOSIT);
    }

    function test_removeAsset_makesIneligible() public {
        // Initially eligible
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));

        // Owner removes asset
        vm.prank(owner);
        oracle.removeAsset(mockAsset);

        // Now ineligible
        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        oracle.isEligible(mockAsset, Actions.DEPOSIT);

        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        oracle.nav(mockAsset);
    }

    function test_cannotRemoveAlreadyRemovedAsset() public {
        vm.prank(owner);
        oracle.removeAsset(mockAsset);

        vm.prank(owner);
        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        oracle.removeAsset(mockAsset);
    }

    function test_addAsset_validation() public {
        vm.startPrank(owner);
        // Zero address reverts
        vm.expectRevert("zero asset address");
        oracle.addAsset(address(0), 1 days);

        // Zero maxNavAge reverts
        vm.expectRevert("zero maxNavAge");
        oracle.addAsset(address(0x2222), 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------
    // NAV Freshness Tests
    // -------------------------------------------------------

    function test_freshNAV() public {
        // Immediately fresh
        assertTrue(oracle.isNavFresh(mockAsset));
        assertEq(oracle.nav(mockAsset), INITIAL_NAV);

        // Still fresh just before maxNavAge
        vm.warp(block.timestamp + DEFAULT_MAX_NAV_AGE);
        assertTrue(oracle.isNavFresh(mockAsset));
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));
    }

    function test_staleNAV_reverts() public {
        // Warp past maxNavAge
        vm.warp(block.timestamp + DEFAULT_MAX_NAV_AGE + 1);

        assertFalse(oracle.isNavFresh(mockAsset));

        // Any action must revert with NavStale
        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.DEPOSIT);

        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.REDEEM);

        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.ALLOCATE);
    }

    function test_navRefresh_restoresEligibility() public {
        // Go stale
        vm.warp(block.timestamp + DEFAULT_MAX_NAV_AGE + 10);
        assertFalse(oracle.isNavFresh(mockAsset));

        // Update NAV
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, 1.06e18, true, 3);

        assertTrue(oracle.isNavFresh(mockAsset));
        assertEq(oracle.nav(mockAsset), 1.06e18);
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));
    }

    // -------------------------------------------------------
    // Redemption Status Tests
    // -------------------------------------------------------

    function test_redemptionOpen_allowsRedeem() public view {
        assertTrue(oracle.isRedemptionOpen(mockAsset));
        assertTrue(oracle.isEligible(mockAsset, Actions.REDEEM));
        assertTrue(oracle.isEligible(mockAsset, Actions.WITHDRAW));
    }

    function test_redemptionClosed_blocksRedeem() public {
        // Toggle redemption closed
        vm.prank(owner);
        oracle.setRedemptionOpen(mockAsset, false);

        assertFalse(oracle.isRedemptionOpen(mockAsset));

        // DEPOSIT is still eligible (deposit does not require redemptionOpen)
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));

        // REDEEM must revert with RedemptionClosed
        vm.expectRevert(IRWAStateOracle.RedemptionClosed.selector);
        oracle.isEligible(mockAsset, Actions.REDEEM);

        // WITHDRAW must revert with RedemptionClosed
        vm.expectRevert(IRWAStateOracle.RedemptionClosed.selector);
        oracle.isEligible(mockAsset, Actions.WITHDRAW);
    }

    function test_redemptionStatus_independentToggle() public {
        vm.startPrank(owner);
        oracle.setRedemptionOpen(mockAsset, false);
        assertFalse(oracle.isRedemptionOpen(mockAsset));

        oracle.setRedemptionOpen(mockAsset, true);
        assertTrue(oracle.isRedemptionOpen(mockAsset));
        vm.stopPrank();
    }

    // -------------------------------------------------------
    // Liquidity Tier Tests (ALLOCATE)
    // -------------------------------------------------------

    function test_sufficientLiquidity_allowsAllocate() public {
        // Tier 1 is sufficient (minLiquidityTier = 1)
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 1);
        assertTrue(oracle.isEligible(mockAsset, Actions.ALLOCATE));

        // Tier 2 is sufficient
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 2);
        assertTrue(oracle.isEligible(mockAsset, Actions.ALLOCATE));

        // Tier 3 is sufficient
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 3);
        assertTrue(oracle.isEligible(mockAsset, Actions.ALLOCATE));
    }

    function test_insufficientLiquidity_blocksAllocate() public {
        // Tier 0 is illiquid (< minLiquidityTier 1)
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 0);

        // DEPOSIT and REDEEM still succeed (they don't require high liquidity)
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));
        assertTrue(oracle.isEligible(mockAsset, Actions.REDEEM));

        // ALLOCATE must revert with LiquidityTooLow
        vm.expectRevert(IRWAStateOracle.LiquidityTooLow.selector);
        oracle.isEligible(mockAsset, Actions.ALLOCATE);
    }

    function test_setMinLiquidityTier() public {
        vm.startPrank(owner);
        // Raise minimum threshold to 2
        oracle.setMinLiquidityTier(2);
        assertEq(oracle.minLiquidityTier(), 2);

        // Tier 1 now fails
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 1);
        vm.stopPrank();

        vm.expectRevert(IRWAStateOracle.LiquidityTooLow.selector);
        oracle.isEligible(mockAsset, Actions.ALLOCATE);

        // Tier 2 succeeds
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, 2);
        assertTrue(oracle.isEligible(mockAsset, Actions.ALLOCATE));
    }

    // -------------------------------------------------------
    // Access Control Tests
    // -------------------------------------------------------

    function test_accessControl_strangerCannotCallAdminFunctions() public {
        vm.startPrank(stranger);

        vm.expectRevert();
        oracle.addAsset(address(0x3333), 1 days);

        vm.expectRevert();
        oracle.removeAsset(mockAsset);

        vm.expectRevert();
        oracle.updateAssetState(mockAsset, 1e18, true, 1);

        vm.expectRevert();
        oracle.setRedemptionOpen(mockAsset, false);

        vm.expectRevert();
        oracle.setMinLiquidityTier(3);

        vm.expectRevert();
        oracle.setMaxNavAge(mockAsset, 2 days);

        vm.stopPrank();
    }

    // -------------------------------------------------------
    // Fuzz Tests
    // -------------------------------------------------------

    /// @dev Stale NAV must NEVER allow protected actions regardless of warp amount.
    function test_fuzz_staleNavCannotPassEligibility(uint256 warpExtra) public {
        warpExtra = bound(warpExtra, 1, 3650 days);
        vm.warp(block.timestamp + DEFAULT_MAX_NAV_AGE + warpExtra);

        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.DEPOSIT);

        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.REDEEM);

        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.ALLOCATE);
    }

    /// @dev Fuzz liquidity tiers: 0 always reverts ALLOCATE, >=1 always succeeds (when min is 1).
    function test_fuzz_liquidityTiers(uint8 tier) public {
        vm.prank(owner);
        oracle.updateAssetState(mockAsset, INITIAL_NAV, true, tier);

        if (tier == 0) {
            vm.expectRevert(IRWAStateOracle.LiquidityTooLow.selector);
            oracle.isEligible(mockAsset, Actions.ALLOCATE);
        } else {
            assertTrue(oracle.isEligible(mockAsset, Actions.ALLOCATE));
        }
    }
}
