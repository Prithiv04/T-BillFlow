// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeployTestTokenScript is Script {
    function run() external returns (address tokenAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying MockUSDC from:", deployer);

        vm.startBroadcast(deployerPrivateKey);
        MockUSDC token = new MockUSDC();
        vm.stopBroadcast();

        console2.log("MockUSDC deployed at:", address(token));
        return address(token);
    }
}
