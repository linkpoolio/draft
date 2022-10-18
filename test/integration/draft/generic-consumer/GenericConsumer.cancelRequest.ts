import { expect } from "chai";
import { BigNumber } from "ethers";

import { RequestType } from "../../../../tasks/draft/generic-consumer/constants";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import { increaseTo } from "../../../helpers/time";
import type { Context, Signers } from "./GenericConsumer";

export function testCancelRequest(signers: Signers, context: Context): void {
  const overrides: Overrides = {};
  let snapshotId: string;

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when the expiry time has not past (less than 5 minutes)", async function () {
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
    const balanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    expect(balanceBefore).to.equal(BigNumber.from("0"));
    await expect(
      context.genericConsumer
        .connect(signers.owner)
        .cancelRequest(requestId, payment, callbackFunctionSignature, cancelExpiration, overrides),
    ).to.be.revertedWith("Request is not expired");
  });

  it("reverts when caller is not the request consumer (requester is not the owner, caller is the owner)", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, payment);
    await context.genericConsumer.connect(signers.deployer).addFunds(signers.externalCaller.address, payment);
    await context.genericConsumer
      .connect(signers.externalCaller)
      .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides);
    const filterOracleRequest = context.operator.filters.OracleRequest();
    const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
    const { requestId, cancelExpiration } = eventOracleRequest.args;
    const fiveMinutesTs = 60 * 5;
    await increaseTo(cancelExpiration.add(BigNumber.from(fiveMinutesTs)));

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.owner)
        .cancelRequest(requestId, payment, callbackFunctionSignature, cancelExpiration, overrides),
    ).to.revertedWith(
      `GenericConsumer__CallerIsNotRequestConsumer("${context.genericConsumer.address}", "${signers.externalCaller.address}")`,
    );
  });

  it("reverts when caller is not the request consumer (requester is the owner, caller is not the owner)", async function () {
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
    const fiveMinutesTs = 60 * 5;
    await increaseTo(cancelExpiration.add(BigNumber.from(fiveMinutesTs)));

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.externalCaller)
        .cancelRequest(requestId, payment, callbackFunctionSignature, cancelExpiration, overrides),
    ).to.revertedWith(
      `GenericConsumer__CallerIsNotRequestConsumer("${signers.externalCaller.address}", "${context.genericConsumer.address}")`,
    );
  });

  it("cancels the request (caller is the owner)", async function () {
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
    const fiveMinutesTs = 60 * 5;
    await increaseTo(cancelExpiration.add(BigNumber.from(fiveMinutesTs)));
    const operatorLinkBalanceBefore = await context.linkToken.balanceOf(context.operator.address);
    const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    const ownerLinkBalanceBefore = await context.linkToken.balanceOf(signers.owner.address);
    const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(context.genericConsumer.address);
    const ownerBalanceBefore = await context.genericConsumer.availableFunds(signers.owner.address);

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.owner)
        .cancelRequest(requestId, payment, callbackFunctionSignature, cancelExpiration, overrides),
    )
      .to.emit(context.genericConsumer, "ChainlinkCancelled")
      .withArgs(requestId);
    // Check LINK balances in the LinkToken contract
    expect(await context.linkToken.balanceOf(context.operator.address)).to.equal(
      operatorLinkBalanceBefore.sub(payment),
    );
    expect(await context.linkToken.balanceOf(signers.owner.address)).to.equal(ownerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
      genericConsumerLinkBalanceBefore.add(payment),
    );
    // Check LINK balances in the GenericConsumer contract
    expect(await context.genericConsumer.availableFunds(signers.owner.address)).to.equal(ownerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
      genericConsumerBalanceBefore.add(payment),
    );
  });

  it("cancels the request (caller is not the owner)", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, payment);
    await context.genericConsumer.connect(signers.deployer).addFunds(signers.externalCaller.address, payment);
    await context.genericConsumer
      .connect(signers.externalCaller)
      .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides);
    const filterOracleRequest = context.operator.filters.OracleRequest();
    const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
    const { requestId, cancelExpiration } = eventOracleRequest.args;
    const fiveMinutesTs = 60 * 5;
    await increaseTo(cancelExpiration.add(BigNumber.from(fiveMinutesTs)));
    const operatorLinkBalanceBefore = await context.linkToken.balanceOf(context.operator.address);
    const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    const externalCallerLinkBalanceBefore = await context.linkToken.balanceOf(signers.externalCaller.address);
    const ownerLinkBalanceBefore = await context.linkToken.balanceOf(signers.owner.address);
    const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(context.genericConsumer.address);
    const externalCallerBalanceBefore = await context.genericConsumer.availableFunds(signers.externalCaller.address);
    const ownerBalanceBefore = await context.genericConsumer.availableFunds(signers.owner.address);

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.externalCaller)
        .cancelRequest(requestId, payment, callbackFunctionSignature, cancelExpiration, overrides),
    )
      .to.emit(context.genericConsumer, "ChainlinkCancelled")
      .withArgs(requestId);
    // Check LINK balances in the LinkToken contract
    expect(await context.linkToken.balanceOf(context.operator.address)).to.equal(
      operatorLinkBalanceBefore.sub(payment),
    );
    expect(await context.linkToken.balanceOf(signers.owner.address)).to.equal(ownerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(signers.externalCaller.address)).to.equal(externalCallerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
      genericConsumerLinkBalanceBefore.add(payment),
    );
    // Check LINK balances in the GenericConsumer contract
    expect(await context.genericConsumer.availableFunds(signers.owner.address)).to.equal(ownerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(signers.externalCaller.address)).to.equal(
      externalCallerBalanceBefore.add(payment),
    );
    expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
      genericConsumerBalanceBefore,
    );
  });
}
