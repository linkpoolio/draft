import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import * as path from "path";

import {
  getEntryConvertedMap,
  parseEntriesFile,
  setCodeOnEntryContractAddresses,
} from "../../../../tasks/draft/generic-consumer/methods";
import type { EntryConverted } from "../../../../tasks/draft/generic-consumer/types";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testSetLastRequestTimestamp(signers: Signers, context: Context): void {
  const filePath = path.resolve(__dirname, "draft-entries");
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
    const key = "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9";
    const lastRequestTimestamp = BigNumber.from("1652419676");

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).setLastRequestTimestamp(lot, key, lastRequestTimestamp),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("does not revert when GenericConsumer is paused", async function () {
    // Arrange
    const key = "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9";
    const lastRequestTimestamp = BigNumber.from("1652419676");
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setLastRequestTimestamp(lot, key, lastRequestTimestamp),
    ).to.not.be.revertedWith("Pausable: paused");
  });

  it(`reverts when the lot is not inserted`, async function () {
    // Arrange
    const key = "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9";
    const lastRequestTimestamp = BigNumber.from("1652419676");

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setLastRequestTimestamp(lot, key, lastRequestTimestamp),
    ).to.be.revertedWith(`GenericConsumer__LotIsNotInserted(${lot})`);
  });

  it(`reverts when the Entry is not inserted`, async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key0] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key0) as EntryConverted;
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key0, entryConverted, overrides);
    const key1 = "0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9";

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setLastRequestTimestamp(lot, key1, BigNumber.from("1652419676")),
    ).to.be.revertedWith(`GenericConsumer__EntryIsNotInserted(${lot}, "${key1}")`);
  });

  it("sets the lastRequestTimestamp", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key) as EntryConverted;
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides);

    // Act & Assert
    const lastRequestTimestamp = BigNumber.from("1652419676");
    await expect(
      context.genericConsumer.connect(signers.owner).setLastRequestTimestamp(lot, key, lastRequestTimestamp, overrides),
    )
      .to.emit(context.genericConsumer, "LastRequestTimestampSet")
      .withArgs(lot, key, lastRequestTimestamp);
    expect(await context.genericConsumer.getLastRequestTimestamp(lot, key)).to.equal(lastRequestTimestamp);
  });
}
