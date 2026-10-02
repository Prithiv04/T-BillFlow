// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {RWAStateOracle} from "../src/RWAStateOracle.sol";
import {IRWAStateOracle} from "../src/IRWAStateOracle.sol";
import {Actions} from "../src/Types.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

// ============================================================
//  MockAggregatorV3 — Simulates Chainlink / OpenEden TBILL Oracle
// ============================================================

contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 public override decimals = 8;
    string public override description = "OpenEden TBILL / USD Price Feed";
    uint256 public override version = 1;

    uint80 public roundId = 1;
    int256 public answer = 105250000; // $1.0525 (8 decimals)
    uint256 public startedAt = 1000;
    uint256 public updatedAt = 1000;
    uint80 public answeredInRound = 1;

    function setRoundData(
        uint80 _roundId,
        int256 _answer,
        uint256 _updatedAt,
        uint80 _answeredInRound
    ) external {
        roundId = _roundId;
        answer = _answer;
        startedAt = _updatedAt;
        updatedAt = _updatedAt;
        answeredInRound = _answeredInRound;
    }

    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }

    function getRoundData(uint80 _roundId) external view override returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (_roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function latestRoundData() external view override returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }
}

// ============================================================
//  RWAFeedAdapterTest
// ============================================================

contract RWAFeedAdapterTest is Test {
    RWAStateOracle public oracle;
    MockAggregatorV3 public feed;

    address internal owner = address(0xAAAA);
    address internal keeper = address(0xBBBB);
    address internal mockAsset = address(0x1111);
    uint256 internal constant MAX_NAV_AGE = 1 days;

    function setUp() public {
        vm.warp(2000);
        vm.startPrank(owner);
        oracle = new RWAStateOracle(owner);
        feed = new MockAggregatorV3();

        // Register asset with 1-day maxNavAge
        oracle.addAsset(mockAsset, MAX_NAV_AGE);

        // Bind asset to on-chain feed
        oracle.setAssetFeed(mockAsset, address(feed));

        // Open redemptions and set liquidity tier
        oracle.setRedemptionOpen(mockAsset, true);
        vm.stopPrank();

        // Set feed timestamp aligned with current block.timestamp
        feed.setRoundData(1, 105250000, block.timestamp, 1);
    }

    function test_setAssetFeed_accessControl() public {
        vm.prank(keeper);
        vm.expectRevert();
        oracle.setAssetFeed(mockAsset, address(0x9999));

        vm.prank(owner);
        vm.expectRevert(IRWAStateOracle.AssetNotSupported.selector);
        oracle.setAssetFeed(address(0x8888), address(feed));
    }

    function test_syncFromFeed_success() public {
        // Keeper triggers feed synchronization
        vm.prank(keeper);
        oracle.syncFromFeed(mockAsset);

        // Verify NAV normalized from 8 decimals to 18 decimals: 105250000 * 10^10 = 1052500000000000000 (1.0525e18)
        assertEq(oracle.nav(mockAsset), 1.0525e18);
        assertTrue(oracle.isNavFresh(mockAsset));
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));
    }

    function test_syncFromFeed_noFeedConfigured() public {
        address unconfiguredAsset = address(0x3333);
        vm.prank(owner);
        oracle.addAsset(unconfiguredAsset, MAX_NAV_AGE);

        vm.expectRevert(IRWAStateOracle.NoFeedConfigured.selector);
        oracle.syncFromFeed(unconfiguredAsset);
    }

    function test_syncFromFeed_invalidPrice_reverts() public {
        // Negative or zero price from broken feed
        feed.setRoundData(2, 0, block.timestamp, 2);

        vm.expectRevert(IRWAStateOracle.InvalidOraclePrice.selector);
        oracle.syncFromFeed(mockAsset);

        feed.setRoundData(3, -100, block.timestamp, 3);
        vm.expectRevert(IRWAStateOracle.InvalidOraclePrice.selector);
        oracle.syncFromFeed(mockAsset);
    }

    function test_syncFromFeed_zeroTimestamp_reverts() public {
        feed.setRoundData(2, 105250000, 0, 2);

        vm.expectRevert(IRWAStateOracle.InvalidOracleTimestamp.selector);
        oracle.syncFromFeed(mockAsset);
    }

    function test_syncFromFeed_futureTimestamp_reverts() public {
        feed.setRoundData(2, 105250000, block.timestamp + 500, 2);

        vm.expectRevert(IRWAStateOracle.FutureAttestationTimestamp.selector);
        oracle.syncFromFeed(mockAsset);
    }

    function test_syncFromFeed_staleRound_reverts() public {
        // answeredInRound < roundId indicates incomplete round
        feed.setRoundData(5, 105250000, block.timestamp, 4);

        vm.expectRevert(IRWAStateOracle.StaleAttestationTimestamp.selector);
        oracle.syncFromFeed(mockAsset);
    }

    function test_syncFromFeed_restoresStaleNav() public {
        // Sync initial
        oracle.syncFromFeed(mockAsset);
        assertTrue(oracle.isNavFresh(mockAsset));

        // Advance beyond maxNavAge (stale)
        vm.warp(block.timestamp + MAX_NAV_AGE + 1);
        assertFalse(oracle.isNavFresh(mockAsset));
        vm.expectRevert(IRWAStateOracle.NavStale.selector);
        oracle.isEligible(mockAsset, Actions.DEPOSIT);

        // Update feed and resync
        feed.setRoundData(2, 105300000, block.timestamp, 2); // new NAV $1.0530
        oracle.syncFromFeed(mockAsset);

        // Freshness restored
        assertTrue(oracle.isNavFresh(mockAsset));
        assertEq(oracle.nav(mockAsset), 1.0530e18);
        assertTrue(oracle.isEligible(mockAsset, Actions.DEPOSIT));
    }
}
