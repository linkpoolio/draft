// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { TypeAndVersionInterface } from "@chainlink/contracts/src/v0.8/interfaces/TypeAndVersionInterface.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ConfirmedOwnerUpgradeable } from "../ConfirmedOwnerUpgradeable.sol";
import { ChainlinkExternalFulfillmentCompatible } from "../ChainlinkExternalFulfillmentCompatible.sol";

contract GenericFulfillmentUUPS is
    Initializable,
    UUPSUpgradeable,
    ConfirmedOwnerUpgradeable,
    AccessControlUpgradeable,
    TypeAndVersionInterface,
    ChainlinkExternalFulfillmentCompatible
{
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");
    string private s_description;

    /* ========== FULFILLMENT EXTERNAL FUNCTIONS ========== */

    // Function signature: 0x32146504
    function fulfillBool(bytes32 _requestId, bool _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0xa0c29e01
    function fulfillBoolArray(bytes32 _requestId, bool[] calldata _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0x0941dfb3
    function fulfillBytes32(bytes32 _requestId, bytes32 _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0x622232e7
    function fulfillBytes32Array(bytes32 _requestId, bytes32[] calldata _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0xc2fb8523
    function fulfillBytes(bytes32 _requestId, bytes calldata _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0xe5a2a1f8
    function fulfillBytesArray(bytes32 _requestId, bytes[] memory _results)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0x5eb6f000
    function fulfillInt256(bytes32 _requestId, int256 _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0x5fea1383
    function fulfillInt256Array(bytes32 _requestId, int256[] calldata _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0xa6bdca07
    function fulfillString(bytes32 _requestId, string calldata _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0x86666ba9
    function fulfillStringArray(bytes32 _requestId, string[] memory _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0x7c1f72a0
    function fulfillUint256(bytes32 _requestId, uint256 _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    // Function signature: 0xbdbb1b85
    function fulfillUint256Array(bytes32 _requestId, uint256[] calldata _result)
        external
        recordFulfillment(_requestId)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    /* ========== EXTERNAL FUNCTIONS ========== */

    function initialize(
        string calldata _description,
        address[] memory _admins,
        address[] memory _consumers
    ) external initializer {
        __ConfirmedOwnerUpgradeable_init(msg.sender);
        s_description = _description;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRoleTo(DEFAULT_ADMIN_ROLE, _admins);
        _grantRoleTo(CONSUMER_ROLE, _consumers);
    }

    function setDescription(string calldata _description) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_description = _description;
    }

    function setExternalPendingRequest(address _oracleAddr, bytes32 _requestId) external onlyRole(CONSUMER_ROLE) {
        _addPendingRequest(_oracleAddr, _requestId);
    }

    /* ========== EXTERNAL VIEW FUNCTIONS ========== */

    function getDescription() external view returns (string memory) {
        return s_description;
    }

    /* ========== EXTERNAL PURE FUNCTIONS ========== */

    /**
     * @notice versions:
     *
     * - GenericFulfillmentUUPS 1.0.0: initial release
     *
     * @inheritdoc TypeAndVersionInterface
     */
    function typeAndVersion() external pure virtual override returns (string memory) {
        return "GenericFulfillmentUUPS 1.0.0";
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    /* ========== PRIVATE FUNCTIONS ========== */

    function _grantRoleTo(bytes32 _role, address[] memory _accounts) private onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 accountsLength = _accounts.length;
        for (uint256 i = 0; i < accountsLength; ) {
            _grantRole(_role, _accounts[i]);
            unchecked {
                ++i;
            }
        }
    }
}
