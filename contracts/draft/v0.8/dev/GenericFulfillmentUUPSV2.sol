// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import { GenericFulfillmentUUPS, TypeAndVersionInterface } from "./GenericFulfillmentUUPS.sol";

contract GenericFulfillmentUUPSV2 is GenericFulfillmentUUPS {
    event RequestFulfilledTestV2(
        bytes32 indexed requestId,
        bool result,
        uint256 resultUint256,
        bytes32[] resultBytes32Array
    );

    /* ========== FULFILLMENT EXTERNAL FUNCTIONS ========== */

    function fulfillTestV2(
        bytes32 _requestId,
        bool _result,
        uint256 resultUint256,
        bytes32[] calldata _resultBytes32Array
    )
        external
        // solhint-disable-next-line no-empty-blocks
        recordFulfillment(_requestId)
    {
        emit RequestFulfilledTestV2(_requestId, _result, resultUint256, _resultBytes32Array);
    }

    /* ========== EXTERNAL PURE FUNCTIONS ========== */
    /**
     * @notice versions:
     *
     * - GenericFulfillmentUUPS 1.0.0: initial release
     * - GenericFulfillmentUUPS 1.1.0: initial release
     *
     * @inheritdoc TypeAndVersionInterface
     */
    function typeAndVersion() external pure virtual override returns (string memory) {
        return "GenericFulfillmentUUPS 1.1.0";
    }
}
