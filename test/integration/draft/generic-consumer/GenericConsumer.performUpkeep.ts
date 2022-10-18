import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import { ethers } from "hardhat";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { BetterSet } from "../../../../libs/better-set";
import {
  addEntries,
  getEntryConvertedMap,
  parseEntriesFile,
  setCodeOnEntryContractAddresses,
} from "../../../../tasks/draft/generic-consumer/methods";
import { keepersPerformGasLimit } from "../../../../utils/chainlink-constants";
import { ChainId } from "../../../../utils/constants";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import { increaseTo } from "../../../helpers/time";
import type { Context, Signers } from "./GenericConsumer";

export function testPerformUpkeep(signers: Signers, context: Context): void {
  const filePath = path.resolve(__dirname, "draft-entries");
  const overrides: Overrides = {};
  const overridesPerformUpkeep: Overrides = {};
  const lot = BigNumber.from("1");
  let snapshotId: string;

  beforeEach(async function () {
    overridesPerformUpkeep.gasLimit = keepersPerformGasLimit.get(ChainId.HARDHAT);
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when GenericConsumer is paused", async function () {
    // Arrange
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.externalCaller).performUpkeep("0x")).to.be.revertedWith(
      "Pausable: paused",
    );
  });

  it("reverts when performData is invalid", async function () {
    // Act & Assert
    // TODO: reverts with 'missing revert data in call exception'. Known issue: https://github.com/ethers-io/ethers.js/discussions/2849
    await expect(context.genericConsumer.connect(signers.externalCaller).performUpkeep("0x")).to.be.reverted;
  });

  it("reverts when the performData lot is empty", async function () {
    // Arrange
    const randomKeys = ethers.utils.solidityKeccak256(["string"], ["LinkPool"]);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, [randomKeys]]);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(`GenericConsumer__LotIsNotInserted(${lot})`);
  });

  it("reverts when the caller is not the owner and lot upkeeps are not enabled", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(`GenericConsumer__LotIsNotUpkeepAllowed(${lot})`);
  });

  it("reverts when there performData has no Entry keys", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, []]); // NB: empty array

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(`GenericConsumer__ArrayIsEmpty("keys")`);
  });

  it("reverts when the Entry is not inserted", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const randomKey = ethers.utils.solidityKeccak256(["string"], ["LinkPool"]);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, [randomKey]]);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(`GenericConsumer__EntryIsNotInserted(${lot}, "${randomKey}")`);
  });

  it("reverts when the Entry is not active", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    // Overwrite 'inactive'
    entries.forEach(entry => (entry.inactive = true));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(`GenericConsumer__EntryIsInactive(${lot}, "${keys}")`);
  });

  it("reverts when the Entry is not scheduled (startAt)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    const nowTs = Math.round(new Date().getTime() / 1000) + 3600; // NB: increaseTo() requires a time >= now
    // Overwrite 'startAt' with now + 1h
    entries.forEach(entry => (entry.schedule.startAt = nowTs.toString()));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);
    await increaseTo(nowTs - 2); // NB: force block.timestamp < startAt (by 1s)

    // Act & Assert
    const blockTs = await (await ethers.provider.getBlock("latest")).timestamp;
    const expectedKey = keys[0];
    const expectedInterval = Number(entries[0].schedule.interval);
    const expectedLastRequestTimestamp = 0;
    const expectedBlockTs = blockTs + 1; // NB: delay when expecting a revert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(
      `GenericConsumer__EntryIsNotScheduled(${lot}, "${expectedKey}", ${nowTs}, ${expectedInterval}, ${expectedLastRequestTimestamp}, ${expectedBlockTs})`,
    );
  });

  it("reverts when the Entry is not scheduled (interval)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    const nowTs = Math.round(new Date().getTime() / 1000);
    // Overwrite 'startAt' with now
    entries.forEach(entry => {
      entry.schedule.startAt = nowTs.toString();
      entry.schedule.interval = "60"; // NB: force 1min interval
    });
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    // Overwrite 'lastRequestTimestamp' with now
    const lastRequestTimestamps = Array.from({ length: keys.length }, () => nowTs.toString());
    await context.genericConsumer.connect(signers.owner).setLastRequestTimestamps(lot, keys, lastRequestTimestamps);
    await increaseTo(nowTs + 58); // NB: force block.timestamp == now +  58s + 1s delta
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act & Assert
    const blockTs = await (await ethers.provider.getBlock("latest")).timestamp;
    const expectedKey = keys[0];
    const expectedInterval = Number(entries[0].schedule.interval);
    const expectedLastRequestTimestamp = nowTs;
    const expectedBlockTs = blockTs + 1; // NB: delay when expecting a revert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(
      `GenericConsumer__EntryIsNotScheduled(${lot}, "${expectedKey}", ${nowTs}, ${expectedInterval}, ${expectedLastRequestTimestamp}, ${expectedBlockTs})`,
    );
  });

  it("reverts when consumer has not enough funds (case: consumer is GenericConsumer)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    // Overwrite 'oracleAddr' and 'callbackAddr' with the right contract addresses
    entries.forEach(entry => {
      entry.requestData.oracleAddr = context.operator.address;
      entry.requestData.callbackAddr = context.genericConsumer.address;
    });
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act & Assert
    // TODO: it should revert with "unable to transferAndCall to oracle"
    await expect(
      context.genericConsumer.connect(signers.owner).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${context.genericConsumer.address}", 0, ${roundPayment.toString()})`,
    );
  });

  it("reverts when consumer has not enough funds (case: consumer is not GenericConsumer)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    // Overwrite 'oracleAddr' and 'callbackAddr' with the right contract addresses
    entries.forEach(entry => {
      entry.requestData.oracleAddr = context.operator.address;
      entry.requestData.callbackAddr = context.genericConsumer.address;
    });
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act & Assert
    // TODO: it should revert with "unable to transferAndCall to oracle"
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${signers.externalCaller.address}", 0, ${roundPayment.toString()})`,
    );
  });

  it("emits an event when calling 'IChainlinkExternalFulfillment.setExternalPendingRequest()' reverts", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
    // Overwrite 'oracleAddr' with the right contract address,
    // and 'callbackAddr' with an external contract that does not have 'setChainlinkExternalRequest()'
    entries.forEach(entry => {
      entry.requestData.oracleAddr = context.operator.address;
      entry.requestData.callbackAddr = context.operator.address;
    });
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const keys = [...entryConvertedMap.keys()];
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet(keys),
      true,
      overrides,
    );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(signers.externalCaller.address, roundPayment);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act & Assert
    const expectedRequestId = "0x1bfce59c2e0d7e0f015eb02ec4e04de4e67a1fe1508a4420cfd49c650758abe6";
    await expect(
      context.genericConsumer.connect(signers.externalCaller).performUpkeep(performData, overridesPerformUpkeep),
    )
      .to.emit(context.genericConsumer, "ChainlinkRequested")
      .withArgs(expectedRequestId)
      .to.emit(context.genericConsumer, "SetExternalPendingRequestFailed")
      .withArgs(context.operator.address, expectedRequestId, keys[0]);
  });

  const testCases1 = [
    {
      name: "caller is the owner",
      testData: {
        isSignerOwner: true,
      },
    },
    {
      name: "caller is not the owner",
      testData: {
        isSignerOwner: false,
      },
    },
  ];
  for (const { name, testData } of testCases1) {
    it(`performs an upkeep (callbackAddr is GenericConsumer address, ${name})`, async function () {
      // Store 2 Entry and call 'performUpkeep()' with a low gasLimit, which triggers the 'minGasLimit' logic
      // Arrange
      const noEntries = 2;
      const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
      // Overwrite 'externalJobId', 'oracleAddr' and 'callbackAddr'
      const extendedEntries = [...Array(noEntries)].map(() => {
        const entry = JSON.parse(JSON.stringify(entries[0]));
        entry.requestData.externalJobId = uuidv4();
        entry.requestData.oracleAddr = context.operator.address;
        entry.requestData.callbackAddr = context.genericConsumer.address;
        return entry;
      });
      const entryConvertedMap = await getEntryConvertedMap(extendedEntries, context.toolsChainlinkTestHelper);
      const keys = [...entryConvertedMap.keys()];
      await addEntries(
        context.genericConsumer,
        signers.owner,
        lot,
        entryConvertedMap,
        new BetterSet(keys),
        true,
        overrides,
      );
      await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
      const roundPayment = [...entryConvertedMap.values()]
        .map(entryConverted => entryConverted.payment)
        .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
      await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
      await context.genericConsumer
        .connect(signers.deployer)
        .addFunds(
          testData.isSignerOwner ? context.genericConsumer.address : signers.externalCaller.address,
          roundPayment,
        );
      const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);
      overridesPerformUpkeep.gasLimit = BigNumber.from("400000");
      if (!testData.isSignerOwner) {
        await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
      }

      // Act & Assert
      const roundId = 1;
      const [key0, key1] = keys;
      // NB: 'requestId' is deterministic if the 'ChainlinkClient._rawRequest()' params are constants between tests
      const requestId0 = "0x1bfce59c2e0d7e0f015eb02ec4e04de4e67a1fe1508a4420cfd49c650758abe6";
      // const requestId1 = "0x361026df7ededb1a30705e128ae915fc24de9b01768876bcdfd18fef030a744c";
      const blockTimestamp = await (await ethers.provider.getBlock("latest")).timestamp;
      await expect(
        context.genericConsumer
          .connect(testData.isSignerOwner ? signers.owner : signers.externalCaller)
          .performUpkeep(performData, overridesPerformUpkeep),
      )
        .to.emit(context.genericConsumer, "ChainlinkRequested")
        .withArgs(requestId0)
        .to.emit(context.genericConsumer, "EntryRequested")
        .withArgs(roundId, lot, key0, requestId0);
      // TODO: waffle bug, chaining certain events fail
      //   .to.not.emit(context.genericConsumer, "ChainlinkRequested")
      //   .withArgs(requestId1)
      //   .to.not.emit(context.genericConsumer, "EntryRequested")
      //   .withArgs(roundId, lot, key1, requestId1);
      const lastRequestTimestamp0 = await context.genericConsumer.getLastRequestTimestamp(lot, key0);
      expect(lastRequestTimestamp0).to.equal(blockTimestamp + 1);
      const lastRequestTimestamp1 = await context.genericConsumer.getLastRequestTimestamp(lot, key1);
      expect(lastRequestTimestamp1).to.equal(0);
      const latestRoundId = await context.genericConsumer.getLatestRoundId();
      expect(latestRoundId).to.equal(roundId);
    });
  }

  for (const { name, testData } of testCases1) {
    it(`performs an upkeep (callbackAddr is genericFulfillmentTestHelper address, ${name})`, async function () {
      // Store 2 Entry and call 'performUpkeep()' with a low gasLimit, which triggers the 'minGasLimit' logic
      // Arrange
      const noEntries = 2;
      const entries = parseEntriesFile(path.join(filePath, "performupkeep.json"));
      // Overwrite 'externalJobId', 'oracleAddr' and 'callbackAddr'
      const extendedEntries = [...Array(noEntries)].map(() => {
        const entry = JSON.parse(JSON.stringify(entries[0]));
        entry.requestData.externalJobId = uuidv4();
        entry.requestData.oracleAddr = context.operator.address;
        entry.requestData.callbackAddr = context.genericFulfillmentTestHelper.address;
        return entry;
      });
      const entryConvertedMap = await getEntryConvertedMap(extendedEntries, context.toolsChainlinkTestHelper);
      const keys = [...entryConvertedMap.keys()];
      await addEntries(
        context.genericConsumer,
        signers.owner,
        lot,
        entryConvertedMap,
        new BetterSet(keys),
        true,
        overrides,
      );
      await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
      const roundPayment = [...entryConvertedMap.values()]
        .map(entryConverted => entryConverted.payment)
        .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
      await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
      await context.genericConsumer
        .connect(signers.deployer)
        .addFunds(
          testData.isSignerOwner ? context.genericConsumer.address : signers.externalCaller.address,
          roundPayment,
        );
      const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);
      overridesPerformUpkeep.gasLimit = BigNumber.from("400000");
      if (!testData.isSignerOwner) {
        await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);
      }

      // Act & Assert
      const roundId = 1;
      const [key0, key1] = keys;
      // NB: 'requestId' is deterministic if the 'ChainlinkClient._rawRequest()' params are constants between tests
      const requestId0 = "0x1bfce59c2e0d7e0f015eb02ec4e04de4e67a1fe1508a4420cfd49c650758abe6";
      // const requestId1 = "0x361026df7ededb1a30705e128ae915fc24de9b01768876bcdfd18fef030a744c";
      const blockTimestamp = await (await ethers.provider.getBlock("latest")).timestamp;
      await expect(
        context.genericConsumer
          .connect(testData.isSignerOwner ? signers.owner : signers.externalCaller)
          .performUpkeep(performData, overridesPerformUpkeep),
      )
        .to.emit(context.genericConsumer, "ChainlinkRequested")
        .withArgs(requestId0)
        .to.emit(context.genericConsumer, "EntryRequested")
        .withArgs(roundId, lot, key0, requestId0);
      // TODO: waffle bug, chaining certain events fail
      //   .to.not.emit(context.genericConsumer, "ChainlinkRequested")
      //   .withArgs(requestId1)
      //   .to.not.emit(context.genericConsumer, "EntryRequested")
      //   .withArgs(roundId, lot, key1, requestId1);
      const lastRequestTimestamp0 = await context.genericConsumer.getLastRequestTimestamp(lot, key0);
      expect(lastRequestTimestamp0).to.equal(blockTimestamp + 1);
      const lastRequestTimestamp1 = await context.genericConsumer.getLastRequestTimestamp(lot, key1);
      expect(lastRequestTimestamp1).to.equal(0);
      const latestRoundId = await context.genericConsumer.getLatestRoundId();
      expect(latestRoundId).to.equal(roundId);
    });
  }
}
