// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { ConfirmedOwnerWithProposalUpgradeable } from "./ConfirmedOwnerWithProposalUpgradeable.sol";

/**
 * @title The ConfirmedOwner contract
 * @notice A contract with helpers for basic contract ownership.
 */
contract ConfirmedOwnerUpgradeable is Initializable, ConfirmedOwnerWithProposalUpgradeable {
    function __ConfirmedOwnerUpgradeable_init(address _newOwner) public onlyInitializing {
        __ConfirmedOwnerWithProposalUpgradeable_init(_newOwner, address(0));
    }
}
