import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { RequestType } from "../../../../tasks/draft/generic-consumer/constants";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

// TODO: test when _requireLinkTransferFrom() reverts (LINK.transferFrom fails)
export function testFallback(signers: Signers, context: Context): void {
  const overrides: Overrides = {};
  let snapshotId: string;

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when GenericConsumer is paused", async function () {
    // Arrange
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.externalCaller).fallback(overrides)).to.be.revertedWith(
      "Pausable: paused",
    );
  });

  it("reverts when the transaction sent contains ETH", async function () {
    // Arrange
    // TODO: use ethers and/or typechain interface to make it more readable
    const callbackFunctionSignature = "0x7c1f72a0"; // NB: "fulfillUint256(bytes32,uint256)" function signature
    const txRequest = {
      to: context.genericConsumer.address,
      from: signers.externalCaller.address,
      data: callbackFunctionSignature,
      value: ethers.utils.parseEther("1.0"),
    };

    // Act & Assert
    await expect(signers.externalCaller.sendTransaction(txRequest)).to.be.revertedWith(
      `Transaction reverted: fallback function is not payable and was called with value 1000000000000000000`,
    );
  });

  it("reverts when msg.data does not have the minimum length", async function () {
    // Arrange
    // TODO: use ethers and/or typechain interface to make it more readable
    const callbackFunctionSignature = "0x7c1f72a0"; // NB: "fulfillUint256(bytes32,uint256)" function signature
    const txRequest = {
      to: context.genericConsumer.address,
      from: signers.externalCaller.address,
      data: callbackFunctionSignature,
    };

    // Act & Assert
    await expect(signers.externalCaller.sendTransaction(txRequest)).to.be.revertedWith(
      "GenericConsumer__FallbackMsgDataIsInvalid",
    );
  });

  it("reverts when the 'requestId' is not pending", async function () {
    // Arrange
    // TODO: use ethers and/or typechain interface to make it more readable
    const callbackFunctionSignature = "0x7c1f72a0"; // NB: "fulfillUint256(bytes32,uint256)" function signature
    const requestId = "0x1bfce59c2e0d7e0f015eb02ec4e04de4e67a1fe1508a4420cfd49c650758abe6";
    const txRequest = {
      to: context.genericConsumer.address,
      from: signers.externalCaller.address,
      data: `${callbackFunctionSignature}${requestId.slice(2)}`,
    };

    // Act & Assert
    await expect(signers.externalCaller.sendTransaction(txRequest)).to.be.revertedWith(
      "GenericConsumer__RequestIsNotPending",
    );
  });

  it("fulfills the request", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, payment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, payment);
    await context.genericConsumer
      .connect(signers.owner)
      .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides);
    const filterOracleRequest = context.operator.filters.OracleRequest();
    const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
    const { requestId, cancelExpiration } = eventOracleRequest.args;

    // Act & Assert
    const result = BigNumber.from("777");
    const encodedData = ethers.utils.defaultAbiCoder.encode(["bytes32", "uint256"], [requestId, result]);
    const msgData = `${callbackFunctionSignature}${encodedData.slice(2)}`;
    await expect(
      context.operator
        .connect(signers.operatorSender)
        .fulfillOracleRequest2(
          requestId,
          payment,
          context.genericConsumer.address,
          callbackFunctionSignature,
          cancelExpiration,
          encodedData,
        ),
    )
      .to.emit(context.genericConsumer, "ChainlinkFulfilled")
      .withArgs(requestId, true, false, context.genericConsumer.address, callbackFunctionSignature, msgData);
  });

  it("fails to fulfill an external request", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackAddr = context.genericFulfillmentTestHelper.address;
    const callbackFunctionSignature = "0x04dce1cf"; // NB: non-existent method in GenericFulfillmentTestHelper
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, payment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, payment);
    await context.genericConsumer
      .connect(signers.owner)
      .requestDataAndForwardResponse(
        specId,
        oracle,
        payment,
        callbackAddr,
        callbackFunctionSignature,
        requestType,
        buffer,
        overrides,
      );
    const filterOracleRequest = context.operator.filters.OracleRequest();
    const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
    const { requestId, cancelExpiration } = eventOracleRequest.args;

    // Act & Assert
    const result = BigNumber.from("777");
    const encodedData = ethers.utils.defaultAbiCoder.encode(["bytes32", "uint256"], [requestId, result]);
    const msgData = `${callbackFunctionSignature}${encodedData.slice(2)}`;
    await expect(
      context.operator
        .connect(signers.operatorSender)
        .fulfillOracleRequest2(
          requestId,
          payment,
          context.genericConsumer.address,
          callbackFunctionSignature,
          cancelExpiration,
          encodedData,
        ),
    )
      .to.emit(context.genericConsumer, "ChainlinkFulfilled")
      .withArgs(requestId, false, true, callbackAddr, callbackFunctionSignature, msgData);
  });

  it("fulfills an external request", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackAddr = context.genericFulfillmentTestHelper.address;
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, payment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, payment);
    await context.genericConsumer
      .connect(signers.owner)
      .requestDataAndForwardResponse(
        specId,
        oracle,
        payment,
        callbackAddr,
        callbackFunctionSignature,
        requestType,
        buffer,
        overrides,
      );
    const filterOracleRequest = context.operator.filters.OracleRequest();
    const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
    const { requestId, cancelExpiration } = eventOracleRequest.args;

    // Act & Assert
    const result = BigNumber.from("777");
    const encodedData = ethers.utils.defaultAbiCoder.encode(["bytes32", "uint256"], [requestId, result]);
    const msgData = `${callbackFunctionSignature}${encodedData.slice(2)}`;
    await expect(
      context.operator
        .connect(signers.operatorSender)
        .fulfillOracleRequest2(
          requestId,
          payment,
          context.genericConsumer.address,
          callbackFunctionSignature,
          cancelExpiration,
          encodedData,
        ),
    )
      .to.emit(context.genericConsumer, "ChainlinkFulfilled")
      .withArgs(requestId, true, true, callbackAddr, callbackFunctionSignature, msgData)
      .to.emit(context.genericFulfillmentTestHelper, "RequestFulfilledUint256")
      .withArgs(requestId, result);
  });
}
