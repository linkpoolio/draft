// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { OwnableInterface } from "@chainlink/contracts/src/v0.8/interfaces/OwnableInterface.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title The ConfirmedOwner contract
 * @notice A contract with helpers for basic contract ownership.
 */
contract ConfirmedOwnerWithProposalUpgradeable is Initializable, OwnableInterface {
    address private s_owner;
    address private s_pendingOwner;

    error OwnedUpgradeable__CallerIsNotProposedOwner();
    error OwnedUpgradeable__CallerIsNotOwner();
    error OwnedUpgradeable__NewOwnerAddressIsZero();
    error OwnedUpgradeable__NewOwnerIsAlreadyOwner();

    event OwnershipTransferRequested(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function __ConfirmedOwnerWithProposalUpgradeable_init(address _newOwner, address _pendingOwner)
        public
        onlyInitializing
    {
        if (_newOwner == address(0)) {
            revert OwnedUpgradeable__NewOwnerAddressIsZero();
        }

        s_owner = _newOwner;
        if (_pendingOwner != address(0)) {
            _transferOwnership(_pendingOwner);
        }
    }

    /**
     * @notice Allows an owner to begin transferring ownership to a new address,
     * pending.
     */
    function transferOwnership(address to) public override onlyOwner {
        _transferOwnership(to);
    }

    /**
     * @dev Allows an ownership transfer to be completed by the recipient.
     */
    function acceptOwnership() external override {
        if (msg.sender != s_pendingOwner) {
            revert OwnedUpgradeable__CallerIsNotProposedOwner();
        }

        address oldOwner = s_owner;
        s_owner = msg.sender;
        s_pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    /**
     * @notice Get the current owner
     */
    function owner() public view override returns (address) {
        return s_owner;
    }

    /**
     * @notice validate, transfer ownership, and emit relevant events
     */
    function _transferOwnership(address _to) private {
        if (_to == msg.sender) {
            revert OwnedUpgradeable__NewOwnerIsAlreadyOwner();
        }

        s_pendingOwner = _to;

        emit OwnershipTransferRequested(s_owner, _to);
    }

    /**
     * @notice validate access
     */
    function _validateOwnership() internal view {
        if (msg.sender != s_owner) {
            revert OwnedUpgradeable__CallerIsNotOwner();
        }
    }

    /**
     * @notice Reverts if called by anyone other than the contract owner.
     */
    modifier onlyOwner() {
        _validateOwnership();
        _;
    }
}
