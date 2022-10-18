import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import { ethers } from "hardhat";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { RequestType } from "../../../../tasks/draft/generic-consumer/constants";
import {
  getEntryConvertedMap,
  parseEntriesFile,
  setCodeOnEntryContractAddresses,
} from "../../../../tasks/draft/generic-consumer/methods";
import type { EntryConverted } from "../../../../tasks/draft/generic-consumer/types";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testSetEntries(signers: Signers, context: Context): void {
  const filePath = path.resolve(__dirname, "draft-entries");
  const symbolOracleAsGenericConsumer = Symbol();
  const overrides: Overrides = {};
  const lot = BigNumber.from("1");
  let snapshotId: string;

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when the caller is the owner", async function () {
    // Arrange
    const entry = {
      key: "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9",
      specId: "0x3664643663353330363730663437343262646663323035356439336366363363",
      oracle: "0x0000000000000000000000000000000000000001",
      payment: BigNumber.from("100000000000000000"),
      callbackAddr: context.genericConsumer.address,
      callbackFunctionSignature: "0x397e20fc",
      requestType: RequestType.OPERATOR,
      buffer: "0x",
      startAt: BigNumber.from("0"),
      interval: BigNumber.from("60"),
      inactive: false,
    };

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).setEntries(lot, [entry.key], [entry]),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("does not revert when GenericConsumer is paused", async function () {
    // Arrange
    const entry = {
      key: "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9",
      specId: "0x3664643663353330363730663437343262646663323035356439336366363363",
      oracle: "0x0000000000000000000000000000000000000001",
      payment: BigNumber.from("100000000000000000"),
      callbackAddr: context.genericConsumer.address,
      callbackFunctionSignature: "0x397e20fc",
      requestType: RequestType.OPERATOR,
      buffer: "0x",
      startAt: BigNumber.from("0"),
      interval: BigNumber.from("60"),
      inactive: false,
    };
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setEntries(lot, [entry.key], [entry]),
    ).to.not.be.revertedWith("Pausable: paused");
  });

  it("reverts when the keys array is empty", async function () {
    // Arrange
    const entry = {
      key: "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9",
      specId: "0x3664643663353330363730663437343262646663323035356439336366363363",
      oracle: "0x0000000000000000000000000000000000000001",
      payment: BigNumber.from("100000000000000000"),
      callbackAddr: context.genericConsumer.address,
      callbackFunctionSignature: "0x397e20fc",
      requestType: RequestType.OPERATOR,
      buffer: "0x",
      startAt: BigNumber.from("0"),
      interval: BigNumber.from("60"),
      inactive: false,
    };

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).setEntries(lot, [], [entry, entry])).to.be.revertedWith(
      `GenericConsumer__ArrayIsEmpty("keys")`,
    );
  });

  it("reverts when the keys array does not have the same length than entries array", async function () {
    // Arrange
    const entry = {
      key: "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9",
      specId: "0x3664643663353330363730663437343262646663323035356439336366363363",
      oracle: "0x0000000000000000000000000000000000000001",
      payment: BigNumber.from("100000000000000000"),
      callbackAddr: context.genericConsumer.address,
      callbackFunctionSignature: "0x397e20fc",
      requestType: RequestType.OPERATOR,
      buffer: "0x",
      startAt: BigNumber.from("0"),
      interval: BigNumber.from("60"),
      inactive: false,
    };

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setEntries(lot, [entry.key], [entry, entry]),
    ).to.be.revertedWith(`GenericConsumer__ArrayLengthsAreNotEqual("keys", 1, "entries", 2)`);
  });

  const testCases = [
    {
      name: "specId is bytes32(0)",
      testData: {
        specId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        customError: "GenericConsumer__EntryFieldSpecIdIsZero",
      },
    },
    {
      name: "oracle is not a contract",
      testData: {
        oracle: ethers.constants.AddressZero,
        customError: "GenericConsumer__EntryFieldOracleIsNotContract",
      },
    },
    {
      name: "oracle is GenericConsumer",
      testData: {
        oracle: symbolOracleAsGenericConsumer,
        customError: "GenericConsumer__EntryFieldOracleIsGenericConsumer",
      },
    },
    {
      name: "payment is greater than LINK total supply",
      testData: {
        payment: BigNumber.from("10").pow("27").add("1"),
        customError: "GenericConsumer__EntryFieldPaymentIsGtLinkTotalSupply",
      },
    },
    {
      name: "callbackAddr is not a contract",
      testData: {
        callbackAddr: ethers.constants.AddressZero,
        customError: "GenericConsumer__EntryFieldCallbackAddrIsNotContract",
      },
    },
    {
      name: "callbackFunctionSignature is bytes(0)",
      testData: {
        callbackFunctionSignature: "0x00000000",
        customError: "GenericConsumer__EntryFieldCallbackFunctionSignatureIsZero",
      },
    },
    {
      name: "interval is zero",
      testData: {
        interval: BigNumber.from("0"),
        customError: "GenericConsumer__EntryFieldIntervalIsZero",
      },
    },
  ];
  for (const { name, testData } of testCases) {
    it(`reverts when ${name}`, async function () {
      // Arrange
      let oracle = testData.oracle ?? context.operator.address;
      if (oracle === symbolOracleAsGenericConsumer) {
        oracle = context.genericConsumer.address;
      }
      const entry = {
        key: "0xbb93838938af6eee9a1c648a0370402a83fc320397b9900987c18cc0317fa983",
        specId: testData.specId ?? "0x3666636566346637363332353438363539646665363462336438643732343365",
        oracle: oracle as string,
        payment: testData.payment ?? BigNumber.from("100000000000000000"),
        callbackAddr: testData.callbackAddr ?? context.genericConsumer.address,
        callbackFunctionSignature: testData.callbackFunctionSignature ?? "0x7c1f72a0",
        requestType: RequestType.OPERATOR,
        buffer: "0x",
        interval: testData.interval ?? BigNumber.from("60"),
        startAt: BigNumber.from("0"),
        inactive: false,
      };

      // Act & Assert
      await expect(
        context.genericConsumer.connect(signers.owner).setEntries(lot, [entry.key], [entry], overrides),
      ).to.be.revertedWith(testData.customError);
    });
  }

  it("sets multiple Entry", async function () {
    // Arrange
    const noEntries = 2;
    const specEntries = parseEntriesFile(path.join(filePath, "file1.json"));
    // Overwrite 'requestData.externalJobId' with UUIDs
    const extendedEntries = [...Array(noEntries)].map(() => {
      const entry = JSON.parse(JSON.stringify(specEntries[0]));
      entry.requestData.externalJobId = uuidv4();
      return entry;
    });
    await setCodeOnEntryContractAddresses(hardhat, extendedEntries);
    const entryConvertedMap = await getEntryConvertedMap(extendedEntries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    const [key0, key1] = keys;
    const entryConverted0 = entryConvertedMap.get(key0) as EntryConverted;
    const entryConverted1 = entryConvertedMap.get(key1) as EntryConverted;

    // Act & Assert
    const expectedEntry0 = [
      entryConverted0.specId,
      entryConverted0.oracle,
      entryConverted0.payment,
      entryConverted0.callbackAddr,
      entryConverted0.startAt,
      entryConverted0.interval,
      entryConverted0.callbackFunctionSignature,
      entryConverted0.inactive,
      entryConverted0.requestType,
      entryConverted0.buffer,
    ];
    const expectedEntry1 = [
      entryConverted1.specId,
      entryConverted1.oracle,
      entryConverted1.payment,
      entryConverted1.callbackAddr,
      entryConverted1.startAt,
      entryConverted1.interval,
      entryConverted1.callbackFunctionSignature,
      entryConverted1.inactive,
      entryConverted1.requestType,
      entryConverted1.buffer,
    ];
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.false;
    await expect(
      context.genericConsumer
        .connect(signers.owner)
        .setEntries(lot, keys, [entryConverted0, entryConverted1], overrides),
    )
      .to.emit(context.genericConsumer, "EntrySet")
      .withArgs(lot, key0, expectedEntry0)
      .to.emit(context.genericConsumer, "EntrySet")
      .withArgs(lot, key1, expectedEntry1);
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.true;
    const consumerEntry0 = await context.genericConsumer.getEntry(lot, key0);
    expect(consumerEntry0).to.have.lengthOf(expectedEntry0.length);
    const consumerEntry1 = await context.genericConsumer.getEntry(lot, key1);
    expect(consumerEntry1).to.have.lengthOf(expectedEntry1.length);
    // TODO: array matchers do not work with BigNumbers
    for (const i of Array(consumerEntry0.length).keys()) {
      expect(consumerEntry0[i]).to.equal(expectedEntry0[i]);
      expect(consumerEntry1[i]).to.equal(expectedEntry1[i]);
    }
  });
}
