// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/**
 * @title Isolated Chainlink library functions for internal tooling purposes.
 * @dev @chainlink/contracts/src/v0.8/tests/ChainlinkTestHelper.sol with 'req' visibility set to public.
 */
contract ToolsChainlinkTestHelper {
    using Chainlink for Chainlink.Request;
    using CBORChainlink for BufferChainlink.buffer;

    Chainlink.Request public req;

    event RequestData(bytes payload);

    function closeEvent() public {
        emit RequestData(req.buf.buf);
    }

    function setBuffer(bytes memory data) public {
        Chainlink.Request memory r2 = req;
        r2.setBuffer(data);
        req = r2;
    }

    function add(string memory _key, string memory _value) public {
        Chainlink.Request memory r2 = req;
        r2.add(_key, _value);
        req = r2;
    }

    function addBytes(string memory _key, bytes memory _value) public {
        Chainlink.Request memory r2 = req;
        r2.addBytes(_key, _value);
        req = r2;
    }

    function addInt(string memory _key, int256 _value) public {
        Chainlink.Request memory r2 = req;
        r2.addInt(_key, _value);
        req = r2;
    }

    function addUint(string memory _key, uint256 _value) public {
        Chainlink.Request memory r2 = req;
        r2.addUint(_key, _value);
        req = r2;
    }

    // Temporarily have method receive bytes32[] memory until experimental
    // string[] memory can be invoked from truffle tests.
    function addStringArray(string memory _key, string[] memory _values) public {
        Chainlink.Request memory r2 = req;
        r2.addStringArray(_key, _values);
        req = r2;
    }

    // LinkPool: experimental
    function addUintArray(string memory key, uint256[] memory values) public {
        Chainlink.Request memory r2 = req;
        r2.buf.encodeString(key);
        r2.buf.startArray();
        for (uint256 i = 0; i < values.length; i++) {
            r2.buf.encodeUInt(values[i]);
        }
        r2.buf.endSequence();
        req = r2;
    }

    // LinkPool: experimental
    function addIntArray(string memory key, int256[] memory values) public {
        Chainlink.Request memory r2 = req;
        r2.buf.encodeString(key);
        r2.buf.startArray();
        for (uint256 i = 0; i < values.length; i++) {
            r2.buf.encodeInt(values[i]);
        }
        r2.buf.endSequence();
        req = r2;
    }

    // LinkPool: used to reset the Chainlink.Request
    function resetChainlinkRequest() public {
        Chainlink.Request memory newReq;
        req = newReq;
    }
}
