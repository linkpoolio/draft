import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import { ethers } from "hardhat";
import * as path from "path";

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

export function testSetEntry(signers: Signers, context: Context): void {
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

  it("reverts when the caller is not the owner", async function () {
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
      context.genericConsumer.connect(signers.externalCaller).setEntry(lot, entry.key, entry),
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
    await expect(context.genericConsumer.connect(signers.owner).setEntry(lot, entry.key, entry)).to.not.be.revertedWith(
      "Pausable: paused",
    );
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
        context.genericConsumer.connect(signers.owner).setEntry(lot, entry.key, entry, overrides),
      ).to.be.revertedWith(testData.customError);
    });
  }

  it("sets (creates) an Entry", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key) as EntryConverted;

    // Act & Assert
    const expectedEntry = [
      entryConverted.specId,
      entryConverted.oracle,
      entryConverted.payment,
      entryConverted.callbackAddr,
      entryConverted.startAt,
      entryConverted.interval,
      entryConverted.callbackFunctionSignature,
      entryConverted.inactive,
      entryConverted.requestType,
      entryConverted.buffer,
    ];
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.false;
    await expect(context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides))
      .to.emit(context.genericConsumer, "EntrySet")
      .withArgs(lot, key, expectedEntry);
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.true;
    const consumerEntry = await context.genericConsumer.getEntry(lot, key);
    expect(consumerEntry).to.have.lengthOf(expectedEntry.length);
    // TODO: array matchers do not work with BigNumbers
    for (const i of Array(consumerEntry.length).keys()) {
      expect(consumerEntry[i]).to.equal(expectedEntry[i]);
    }
  });

  it("sets (updates) an Entry", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key) as EntryConverted;
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides);
    // New values
    entryConverted.callbackAddr = context.genericConsumer.address;
    entryConverted.inactive = true;
    entryConverted.interval = BigNumber.from("4242");
    entryConverted.payment = BigNumber.from("700000000000000000");
    entryConverted.startAt = BigNumber.from("12345678");
    entryConverted.requestType = RequestType.ORACLE;

    // Act & Assert
    const expectedEntry = [
      entryConverted.specId,
      entryConverted.oracle,
      entryConverted.payment,
      entryConverted.callbackAddr,
      entryConverted.startAt,
      entryConverted.interval,
      entryConverted.callbackFunctionSignature,
      entryConverted.inactive,
      entryConverted.requestType,
      entryConverted.buffer,
    ];
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.true;
    await expect(context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides))
      .to.emit(context.genericConsumer, "EntrySet")
      .withArgs(lot, key, expectedEntry);
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.true;
    const consumerEntry = await context.genericConsumer.getEntry(lot, key);
    expect(consumerEntry).to.have.lengthOf(expectedEntry.length);
    // TODO: array matchers do not work with BigNumbers
    for (const i of Array(consumerEntry.length).keys()) {
      expect(consumerEntry[i]).to.equal(expectedEntry[i]);
    }
  });
}
