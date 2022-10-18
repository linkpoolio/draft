import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import { ethers } from "hardhat";
import * as path from "path";

import { BetterSet } from "../../../../libs/better-set";
import {
  addEntries,
  getEntryConvertedMap,
  parseEntriesFile,
  setCodeOnEntryContractAddresses,
} from "../../../../tasks/draft/generic-consumer/methods";
import { keepersCheckGasLimit } from "../../../../utils/chainlink-constants";
import { ChainId } from "../../../../utils/constants";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import { increaseTo } from "../../../helpers/time";
import type { Context, Signers } from "./GenericConsumer";

export function testCheckUpkeep(signers: Signers, context: Context): void {
  const filePath = path.resolve(__dirname, "draft-entries");
  const overrides: Overrides = {};
  const overridesCheckUpkeep: Overrides = {};
  const lot = BigNumber.from("1");
  let checkData: string;
  let snapshotId: string;

  beforeEach(async function () {
    checkData = ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [lot, context.genericConsumer.address]);
    overridesCheckUpkeep.gasLimit = keepersCheckGasLimit.get(ChainId.HARDHAT);
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when checkData is not a lot number, and an address", async function () {
    // TODO: reverts with 'missing revert data in call exception'. Known issue: https://github.com/ethers-io/ethers.js/discussions/2849
    // Act & Assert
    await expect(context.genericConsumer.connect(ethers.constants.AddressZero).checkUpkeep("0x")).to.be.reverted;
  });

  it("reverts when the lot is not inserted", async function () {
    // Act & Assert
    // TODO: amend once hardhat fixes issue https://github.com/ethers-io/ethers.js/discussions/2849
    await expect(
      context.genericConsumer.connect(ethers.constants.AddressZero).checkUpkeep(checkData, overridesCheckUpkeep),
    ).to.be.revertedWith(`GenericConsumer__LotIsNotInserted(uint256)`);
    // await expect(
    //   context.genericConsumer.connect(ethers.constants.AddressZero).checkUpkeep(checkData, overridesCheckUpkeep),
    // ).to.be.revertedWith(`GenericConsumer__LotIsNotInserted(${lot})`);
  });

  it("does not need an upkeep when consumer does not have enough funds (case: consumer is GenericConsumer)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-upkeep-not-needed.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet([...entryConvertedMap.keys()]),
      true,
      overrides,
    );

    // Act
    const [isUpkeepNeeded, performData] = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    expect(isUpkeepNeeded).to.be.false;
    expect(performData).to.equal("0x");
  });

  it("does not need an upkeep when consumer does not have enough funds (case: consumer is not GenericConsumer)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-upkeep-not-needed.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet([...entryConvertedMap.keys()]),
      true,
      overrides,
    );
    const checkData = ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [lot, signers.owner.address]);

    // Act
    const [isUpkeepNeeded, performData] = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    expect(isUpkeepNeeded).to.be.false;
    expect(performData).to.equal("0x");
  });

  it("does not need an upkeep when the Entry is inactive", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-upkeep-not-needed.json"));
    // Overwrite 'inactive'
    entries.forEach(entry => (entry.inactive = true));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet([...entryConvertedMap.keys()]),
      true,
      overrides,
    );
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, roundPayment);

    // Act
    const [isUpkeepNeeded, performData] = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    expect(isUpkeepNeeded).to.be.false;
    expect(performData).to.equal("0x");
  });

  it("does not need an upkeep when the Entry is not scheduled (startAt)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-upkeep-not-needed.json"));
    const nowTs = Math.round(new Date().getTime() / 1000) + 3600; // NB: increaseTo() requires a time >= now
    // Overwrite 'startAt' with now + 1h
    entries.forEach(entry => (entry.schedule.startAt = nowTs.toString()));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet([...entryConvertedMap.keys()]),
      true,
      overrides,
    );
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, roundPayment);
    await increaseTo(nowTs - 2); // NB: force block.timestamp < startAt (by 1s)

    // Act
    const [isUpkeepNeeded, performData] = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    expect(isUpkeepNeeded).to.be.false;
    expect(performData).to.equal("0x");
  });

  it("does not need an upkeep when the Entry is not scheduled (interval)", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-upkeep-not-needed.json"));
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
    // Overwrite 'lastRequestTimestamp' with now
    const lastRequestTimestamps = Array.from({ length: keys.length }, () => nowTs.toString());
    await context.genericConsumer.connect(signers.owner).setLastRequestTimestamps(lot, keys, lastRequestTimestamps);
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, roundPayment);
    await increaseTo(nowTs + 58); // NB: force block.timestamp == now + 58s + 1s delta

    // Act
    const [isUpkeepNeeded, performData] = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    expect(isUpkeepNeeded).to.be.false;
    expect(performData).to.equal("0x");
  });

  it("needs an upkeep", async function () {
    /**
     * Entry cases by index:
     * 0 -> non-requestable: inactive
     * 1 -> non-requestable: not scheduled (startAt is tomorrow)
     * 2 -> non-requestable: not scheduled (interval is 60s)
     * 3 -> requestable
     * 4 -> requestable
     */
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-upkeep-needed.json"));
    // Overwrite all 'startAt' with now & tomorrow
    const nowTs = Math.round(new Date().getTime() / 1000);
    entries.forEach(entry => (entry.schedule.startAt = nowTs.toString()));
    // Entry at idx 1: overwrite Entry 'startAt' with tomorrow (unscheduled)
    const tomorrowTs = nowTs + 60 * 60 * 24;
    entries[1].schedule.startAt = tomorrowTs.toString();
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
    // Entry at idx 1: overwrite Entry 'lastRequestTimestamp' with now
    await context.genericConsumer.connect(signers.owner).setLastRequestTimestamp(lot, keys[2], nowTs);
    const roundPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, roundPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, roundPayment);

    // Act
    const [isUpkeepNeeded, performData] = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    const expectedPerformData = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "bytes32[]"],
      [lot, [keys[3], keys[4]]],
    );
    expect(isUpkeepNeeded).to.be.true;
    expect(performData).to.equal(expectedPerformData);
  });
}
