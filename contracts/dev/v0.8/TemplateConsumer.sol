// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/**
 * TBC - Insert here any other relevant information, e.g. param options, data conversions
 */
/**
 * @title TBC - A consumer contract template for...
 * @author LinkPool
 * @notice TBC - To be aware of...
 * @dev Uses @chainlink/contracts 0.4.2.
 */
contract TemplateConsumer is ChainlinkClient {
    using CBORChainlink for BufferChainlink.buffer;
    using Chainlink for Chainlink.Request;

    mapping(bytes32 => bytes) public requestIdResult;

    error FailedTransferLINK(address to, uint256 amount);

    /* ========== CONSTRUCTOR ========== */

    /**
     * @param _link the LINK token address.
     * @param _oracle the Operator.sol contract address.
     */
    constructor(address _link, address _oracle) {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
    }

    /* ========== EXTERNAL FUNCTIONS ========== */

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    ) external {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
    }

    /**
     * @notice TBC - Does something with the data returned by the node job on a particular request...
     * @param _requestId The request ID for fulfillment.
     * @param _result TBC...
     */
    function fulfillRequest(bytes32 _requestId, bytes calldata _result) public recordChainlinkFulfillment(_requestId) {
        requestIdResult[_requestId] = _result;
    }

    /**
     * @notice TBC - Returns...
     * @dev TBC - To be aware of...
     * @param _specId the jobID.
     * @param _payment the LINK amount in Juels (i.e. 10^18 aka 1 LINK).
     * @param _param1 TBC - the string value.
     * @param _param2 TBC - the bytes value.
     * @param _param3 TBC - the signed integer value .
     * @param _param4 TBC - the the unsigned integer value.
     * @param _param5 TBC - the array of string values.
     * @param _param6 TBC - the CBOR payload bytes value.
     */
    function request(
        bytes32 _specId,
        uint256 _payment,
        string calldata _param1,
        bytes calldata _param2,
        int256 _param3,
        uint256 _param4,
        string[] calldata _param5,
        bytes calldata _param6
    ) external {
        Chainlink.Request memory req = buildOperatorRequest(_specId, this.fulfillRequest.selector);

        req.add("endpoint", "<replace-with-endpoint>"); // NB: not required if it has been hardcoded in the job spec

        // Example of each param type method
        req.add("param1", _param1);
        req.addBytes("param2", _param2);
        req.addInt("param3", _param3);
        req.addUint("param4", _param4);
        req.addStringArray("param5", _param5);
        req.setBuffer(_param6); // NB: value does not require a name

        // The function below returns bytes32
        sendOperatorRequest(req, _payment);
    }

    function setOracle(address _oracle) external {
        setChainlinkOracle(_oracle);
    }

    function withdrawLink(address payable _payee, uint256 _amount) external {
        LinkTokenInterface linkToken = LinkTokenInterface(chainlinkTokenAddress());
        if (!linkToken.transfer(_payee, _amount)) {
            revert FailedTransferLINK(_payee, _amount);
        }
    }

    /* ========== EXTERNAL VIEW FUNCTIONS ========== */

    function getOracleAddress() external view returns (address) {
        return chainlinkOracleAddress();
    }

    /* ========== PRIVATE PURE FUNCTIONS ========== */

    function _addIntArray(
        Chainlink.Request memory _req,
        string memory _key,
        int256[] memory _values
    ) private pure {
        Chainlink.Request memory r2 = _req;
        r2.buf.encodeString(_key);
        r2.buf.startArray();
        uint256 valuesLength = _values.length;
        for (uint256 i = 0; i < valuesLength; ) {
            r2.buf.encodeInt(_values[i]);
            unchecked {
                ++i;
            }
        }
        r2.buf.endSequence();
        _req = r2;
    }

    function _addUintArray(
        Chainlink.Request memory _req,
        string memory _key,
        uint256[] memory _values
    ) private pure {
        Chainlink.Request memory r2 = _req;
        r2.buf.encodeString(_key);
        r2.buf.startArray();
        uint256 valuesLength = _values.length;
        for (uint256 i = 0; i < valuesLength; ) {
            r2.buf.encodeUInt(_values[i]);
            unchecked {
                ++i;
            }
        }
        r2.buf.endSequence();
        _req = r2;
    }

    function _sliceDynamicArray(
        uint256 _start,
        uint256 _end,
        bytes memory _data
    ) private pure returns (bytes memory) {
        bytes memory result = new bytes(_end - _start);
        for (uint256 i = 0; i < _end - _start; ++i) {
            result[i] = _data[_start + i];
        }
        return result;
    }

    function _stringToBytes32(string memory source) private pure returns (bytes32 result_) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        // solhint-disable-next-line no-inline-assembly
        assembly {
            result_ := mload(add(source, 32))
        }
    }
}
