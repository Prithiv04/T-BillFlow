// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

contract NoncesHarness is Nonces {
    function useNonce(address account) external returns (uint256) {
        return _useNonce(account);
    }

    function useCheckedNonce(address account, uint256 nonce) external {
        _useCheckedNonce(account, nonce);
    }
}
