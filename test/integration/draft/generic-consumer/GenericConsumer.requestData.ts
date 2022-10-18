import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  OPERATOR_ARGS_VERSION,
  ORACLE_ARGS_VERSION,
  RequestType,
} from "../../../../tasks/draft/generic-consumer/constants";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import { increaseTo } from "../../../helpers/time";
import type { Context, Signers } from "./GenericConsumer";

export function testRequestData(signers: Signers, context: Context): void {
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
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.owner)
        .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides),
    ).to.be.revertedWith("Pausable: paused");
  });

  const testCases1 = [
    {
      name: "specId is bytes32(0)",
      testData: {
        specId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        customError: "GenericConsumer__SpecIdIsZero",
      },
    },
    {
      name: "oracle is not a contract",
      testData: {
        oracle: ethers.constants.AddressZero,
        customError: "GenericConsumer__OracleIsNotContract",
      },
    },
    {
      name: "payment is greater than LINK total supply",
      testData: {
        payment: BigNumber.from("10").pow("27").add("1"),
        customError: "GenericConsumer__LinkPaymentIsGtLinkTotalSupply",
      },
    },
    {
      name: "callbackFunctionSignature is bytes(0)",
      testData: {
        callbackFunctionSignature: "0x00000000",
        customError: "GenericConsumer__CallbackFunctionSignatureIsZero",
      },
    },
  ];
  for (const { name, testData } of testCases1) {
    it(`reverts when ${name}`, async function () {
      // Arrange
      const specId = testData.specId ?? "0x3666636566346637363332353438363539646665363462336438643732343365";
      const oracle = testData.oracle ?? context.operator.address;
      const payment = testData.payment ?? BigNumber.from("100000000000000000");
      const callbackFunctionSignature = testData.callbackFunctionSignature ?? "0x7c1f72a0";
      const requestType = RequestType.OPERATOR;
      const buffer = "0x";

      // Act & Assert
      await expect(
        context.genericConsumer
          .connect(signers.externalCaller)
          .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides),
      ).to.be.revertedWith(testData.customError);
    });
  }

  it("reverts when the caller's balance is not enough (caller is the owner)", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.owner)
        .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${context.genericConsumer.address}", 0, ${payment.toString()})`,
    );
  });

  it("reverts when the caller's balance is not enough (caller is not the owner)", async function () {
    // Arrange
    const specId = "0x3666636566346637363332353438363539646665363462336438643732343365";
    const oracle = context.operator.address;
    const payment = BigNumber.from("100000000000000000");
    const callbackFunctionSignature = "0x7c1f72a0";
    const requestType = RequestType.OPERATOR;
    const buffer = "0x";

    // Act & Assert
    await expect(
      context.genericConsumer
        .connect(signers.externalCaller)
        .requestData(specId, oracle, payment, callbackFunctionSignature, requestType, buffer, overrides),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${signers.externalCaller.address}", 0, ${payment.toString()})`,
    );
  });

  const testCases2 = [
    {
      name: "requestType is ORACLE (0)",
      testData: {
        requestType: RequestType.ORACLE,
        dataVersion: ORACLE_ARGS_VERSION,
      },
    },
    {
      name: "requestType is OPERATOR (1)",
      testData: {
        requestType: RequestType.OPERATOR,
        dataVersion: OPERATOR_ARGS_VERSION,
      },
    },
  ];
  for (const { name, testData } of testCases2) {
    it(`requests data (caller is the owner, ${name})`, async function () {
      // Arrange
      const expectedSpecId = "0x3666636566346637363332353438363539646665363462336438643732343365";
      const expectedOracle = context.operator.address;
      const paymentInEscrow = BigNumber.from("100000000000000000");
      const expectedCallbackFunctionSignature = "0x7c1f72a0";
      const expectedBuffer = "0x";
      await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, paymentInEscrow);
      await context.genericConsumer
        .connect(signers.deployer)
        .addFunds(context.genericConsumer.address, paymentInEscrow);
      const laterTs = Math.round(new Date().getTime() / 1000) + 3600;
      await increaseTo(laterTs);
      const operatorLinkBalanceBefore = await context.linkToken.balanceOf(context.operator.address);
      const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
      const ownerLinkBalanceBefore = await context.linkToken.balanceOf(signers.owner.address);
      const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(
        context.genericConsumer.address,
      );
      const ownerBalanceBefore = await context.genericConsumer.availableFunds(signers.owner.address);

      // Act & Assert
      // NB: 'requestId' is deterministic if the 'ChainlinkClient._rawRequest()' params are constants between tests
      const expectedRequestId = "0x1bfce59c2e0d7e0f015eb02ec4e04de4e67a1fe1508a4420cfd49c650758abe6";
      await expect(
        context.genericConsumer
          .connect(signers.owner)
          .requestData(
            expectedSpecId,
            expectedOracle,
            paymentInEscrow,
            expectedCallbackFunctionSignature,
            testData.requestType,
            expectedBuffer,
            overrides,
          ),
      )
        .to.emit(context.genericConsumer, "ChainlinkRequested")
        .withArgs(expectedRequestId);
      // NB: discarded asserting with chaining events due to unknown 'cancelExpiration' value
      const filterOracleRequest = context.operator.filters.OracleRequest();
      const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
      const {
        specId,
        requester,
        requestId,
        payment,
        callbackAddr,
        callbackFunctionId,
        cancelExpiration,
        dataVersion,
        data,
      } = eventOracleRequest.args;
      expect(specId).to.equal(expectedSpecId);
      expect(requester).to.equal(context.genericConsumer.address);
      expect(requestId).to.equal(expectedRequestId);
      expect(payment).to.equal(paymentInEscrow);
      expect(callbackAddr).to.equal(context.genericConsumer.address);
      expect(callbackFunctionId).to.equal(expectedCallbackFunctionSignature);
      expect(cancelExpiration).to.be.gte(BigNumber.from(laterTs));
      expect(dataVersion).to.equal(testData.dataVersion);
      expect(data).to.equal(expectedBuffer);
      // Check LINK balances in the LinkToken contract
      expect(await context.linkToken.balanceOf(context.operator.address)).to.equal(
        operatorLinkBalanceBefore.add(paymentInEscrow),
      );
      expect(await context.linkToken.balanceOf(signers.owner.address)).to.equal(ownerLinkBalanceBefore);
      expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
        genericConsumerLinkBalanceBefore.sub(paymentInEscrow),
      );
      // Check LINK balances in the GenericConsumer contract
      expect(await context.genericConsumer.availableFunds(signers.owner.address)).to.equal(ownerBalanceBefore);
      expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
        genericConsumerBalanceBefore.sub(paymentInEscrow),
      );
    });

    for (const { name, testData } of testCases2) {
      it(`requests data (caller is not the owner, ${name})`, async function () {
        // Arrange
        const expectedSpecId = "0x3666636566346637363332353438363539646665363462336438643732343365";
        const expectedOracle = context.operator.address;
        const paymentInEscrow = BigNumber.from("100000000000000000");
        const expectedCallbackFunctionSignature = "0x7c1f72a0";
        const expectedBuffer = "0x";
        await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, paymentInEscrow);
        await context.genericConsumer
          .connect(signers.deployer)
          .addFunds(signers.externalCaller.address, paymentInEscrow);
        const laterTs = Math.round(new Date().getTime() / 1000) + 3600;
        await increaseTo(laterTs);
        const operatorLinkBalanceBefore = await context.linkToken.balanceOf(context.operator.address);
        const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
        const ownerLinkBalanceBefore = await context.linkToken.balanceOf(signers.owner.address);
        const externalCallerLinkBalanceBefore = await context.linkToken.balanceOf(signers.externalCaller.address);
        const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(
          context.genericConsumer.address,
        );
        const ownerBalanceBefore = await context.genericConsumer.availableFunds(signers.owner.address);
        const externalCallerBalanceBefore = await context.genericConsumer.availableFunds(
          signers.externalCaller.address,
        );

        // Act & Assert
        // NB: 'requestId' is deterministic if the 'ChainlinkClient._rawRequest()' params are constants between tests
        const expectedRequestId = "0x1bfce59c2e0d7e0f015eb02ec4e04de4e67a1fe1508a4420cfd49c650758abe6";
        await expect(
          context.genericConsumer
            .connect(signers.externalCaller)
            .requestData(
              expectedSpecId,
              expectedOracle,
              paymentInEscrow,
              expectedCallbackFunctionSignature,
              testData.requestType,
              expectedBuffer,
              overrides,
            ),
        )
          .to.emit(context.genericConsumer, "ChainlinkRequested")
          .withArgs(expectedRequestId);
        // NB: discarded asserting with chaining events due to unknown 'cancelExpiration' value
        const filterOracleRequest = context.operator.filters.OracleRequest();
        const [eventOracleRequest] = await context.operator.queryFilter(filterOracleRequest);
        const {
          specId,
          requester,
          requestId,
          payment,
          callbackAddr,
          callbackFunctionId,
          cancelExpiration,
          dataVersion,
          data,
        } = eventOracleRequest.args;
        expect(specId).to.equal(expectedSpecId);
        expect(requester).to.equal(context.genericConsumer.address);
        expect(requestId).to.equal(expectedRequestId);
        expect(payment).to.equal(paymentInEscrow);
        expect(callbackAddr).to.equal(context.genericConsumer.address);
        expect(callbackFunctionId).to.equal(expectedCallbackFunctionSignature);
        expect(cancelExpiration).to.be.gte(BigNumber.from(laterTs));
        expect(dataVersion).to.equal(testData.dataVersion);
        expect(data).to.equal(expectedBuffer);
        // Check LINK balances in the LinkToken contract
        expect(await context.linkToken.balanceOf(context.operator.address)).to.equal(
          operatorLinkBalanceBefore.add(paymentInEscrow),
        );
        expect(await context.linkToken.balanceOf(signers.owner.address)).to.equal(ownerLinkBalanceBefore);
        expect(await context.linkToken.balanceOf(signers.externalCaller.address)).to.equal(
          externalCallerLinkBalanceBefore,
        );
        expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
          genericConsumerLinkBalanceBefore.sub(paymentInEscrow),
        );
        // Check LINK balances in the GenericConsumer contract
        expect(await context.genericConsumer.availableFunds(signers.owner.address)).to.equal(ownerBalanceBefore);
        expect(await context.genericConsumer.availableFunds(signers.externalCaller.address)).to.equal(
          externalCallerBalanceBefore.sub(paymentInEscrow),
        );
        expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
          genericConsumerBalanceBefore,
        );
      });
    }
  }
}
