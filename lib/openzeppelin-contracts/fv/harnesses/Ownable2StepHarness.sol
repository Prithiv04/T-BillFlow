// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract Ownable2StepHarness is Ownable2Step {
    constructor(address initialOwner) Ownable(initialOwner) {}

    function restricted() external onlyOwner {}
}
