import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import {
  getEntryConvertedMap,
  parseEntriesFile,
  setCodeOnEntryContractAddresses,
} from "../../../../tasks/draft/generic-consumer/methods";
import type { EntryConverted } from "../../../../tasks/draft/generic-consumer/types";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testRemoveEntries(signers: Signers, context: Context): void {
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
    const keys = ["0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9"];

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).removeEntries(lot, keys, overrides),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("does not revert when GenericConsumer is paused", async function () {
    // Arrange
    const keys = ["0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9"];
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).removeEntries(lot, keys, overrides),
    ).to.not.be.revertedWith("Pausable: paused");
  });

  it(`reverts when the lot is not inserted`, async function () {
    // Arrange
    const keys = ["0x769fd51a582eda993bbc632329b0937ae591ac75b8255873ec83b743a906f4f9"];

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).removeEntries(lot, keys, overrides)).to.be.revertedWith(
      `GenericConsumer__LotIsNotInserted(${lot})`,
    );
  });

  it(`reverts when the keys array is empty`, async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key0] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key0) as EntryConverted;
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key0, entryConverted, overrides);

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).removeEntries(lot, [], overrides)).to.be.revertedWith(
      `GenericConsumer__ArrayIsEmpty("keys")`,
    );
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
      context.genericConsumer.connect(signers.owner).removeEntries(lot, [key1], overrides),
    ).to.be.revertedWith(`GenericConsumer__EntryIsNotInserted(${lot}, "${key1}")`);
  });

  it(`removes multiple Entry (lot is preserved)`, async function () {
    // Arrange
    const noEntries = 3;
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    // Overwrite 'requestData.externalJobId' with UUIDs
    const extendedEntries = [...Array(noEntries)].map(() => {
      const entry = JSON.parse(JSON.stringify(entries[0]));
      entry.requestData.externalJobId = uuidv4();
      return entry;
    });
    await setCodeOnEntryContractAddresses(hardhat, extendedEntries);
    const entryConvertedMap = await getEntryConvertedMap(extendedEntries, context.toolsChainlinkTestHelper);
    const [key0, key1, key2] = [...entryConvertedMap.keys()];
    const entryConverted0 = entryConvertedMap.get(key0) as EntryConverted;
    const entryConverted1 = entryConvertedMap.get(key1) as EntryConverted;
    const entryConverted2 = entryConvertedMap.get(key2) as EntryConverted;
    await context.genericConsumer
      .connect(signers.owner)
      .setEntries(lot, [key0, key1, key2], [entryConverted0, entryConverted1, entryConverted2], overrides);
    await context.genericConsumer
      .connect(signers.owner)
      .setLastRequestTimestamps(
        lot,
        [key0, key1, key2],
        [BigNumber.from("1652354650"), BigNumber.from("1652354650"), BigNumber.from("1652354650")],
      );
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).removeEntries(lot, [key1, key0], overrides), // NB: inefficient removal in purpose
    )
      .to.emit(context.genericConsumer, "EntryRemoved")
      .withArgs(lot, key1)
      .to.emit(context.genericConsumer, "EntryRemoved")
      .withArgs(lot, key0);
    // TODO: amend once hardhat fixes issue https://github.com/ethers-io/ethers.js/discussions/2849
    await expect(context.genericConsumer.connect(signers.owner).getEntry(lot, key1)).to.be.revertedWith(
      `GenericConsumer__EntryIsNotInserted(uint256,bytes32)`,
    );
    await expect(context.genericConsumer.connect(signers.owner).getEntry(lot, key0)).to.be.revertedWith(
      `GenericConsumer__EntryIsNotInserted(uint256,bytes32)`,
    );
    await expect(context.genericConsumer.getLastRequestTimestamp(lot, key1)).to.be.revertedWith(
      `GenericConsumer__EntryIsNotInserted(uint256,bytes32)`,
    );
    await expect(context.genericConsumer.getLastRequestTimestamp(lot, key0)).to.be.revertedWith(
      `GenericConsumer__EntryIsNotInserted(uint256,bytes32)`,
    );
    // await expect(context.genericConsumer.connect(signers.owner).getEntry(lot, key1)).to.be.revertedWith(
    //   `GenericConsumer__EntryIsNotInserted(${lot}, \\"${key1}\\")`,
    // );
    // await expect(context.genericConsumer.connect(signers.owner).getEntry(lot, key0)).to.be.revertedWith(
    //   `GenericConsumer__EntryIsNotInserted(${lot}, \\"${key0}\\")`,
    // );
    // await expect(context.genericConsumer.getLastRequestTimestamp(lot, key1)).to.be.revertedWith(
    //   `GenericConsumer__EntryIsNotInserted(${lot}, \\"${key1}\\")`,
    // );
    // await expect(context.genericConsumer.getLastRequestTimestamp(lot, key0)).to.be.revertedWith(
    //   `GenericConsumer__EntryIsNotInserted(${lot}, \\"${key0}\\")`,
    // );
    expect(await context.genericConsumer.getEntryIsInserted(lot, key2)).to.be.true;
    expect(await context.genericConsumer.getIsUpkeepAllowed(lot)).to.be.true;
  });

  it(`removes multiple Entry (lot is removed)`, async function () {
    // Arrange
    const noEntries = 2;
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    // Overwrite 'requestData.externalJobId' with UUIDs
    const extendedEntries = [...Array(noEntries)].map(() => {
      const entry = JSON.parse(JSON.stringify(entries[0]));
      entry.requestData.externalJobId = uuidv4();
      return entry;
    });
    await setCodeOnEntryContractAddresses(hardhat, extendedEntries);
    const entryConvertedMap = await getEntryConvertedMap(extendedEntries, context.toolsChainlinkTestHelper);
    const [key0, key1] = [...entryConvertedMap.keys()];
    const entryConverted0 = entryConvertedMap.get(key0) as EntryConverted;
    const entryConverted1 = entryConvertedMap.get(key1) as EntryConverted;
    await context.genericConsumer
      .connect(signers.owner)
      .setEntries(lot, [key0, key1], [entryConverted0, entryConverted1], overrides);
    await context.genericConsumer
      .connect(signers.owner)
      .setLastRequestTimestamps(lot, [key0, key1], [BigNumber.from("1652354650"), BigNumber.from("1652354650")]);
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true, overrides);

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).removeEntries(lot, [key0, key1], overrides))
      .to.emit(context.genericConsumer, "EntryRemoved")
      .withArgs(lot, key0)
      .to.emit(context.genericConsumer, "EntryRemoved")
      .withArgs(lot, key1);
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.false;
    // TODO: amend once hardhat fixes issue https://github.com/ethers-io/ethers.js/discussions/2849
    await expect(context.genericConsumer.connect(signers.owner).getEntry(lot, key0)).to.be.revertedWith(
      `GenericConsumer__LotIsNotInserted(uint256)`,
    );
    await expect(context.genericConsumer.getLastRequestTimestamp(lot, key0)).to.be.revertedWith(
      `GenericConsumer__LotIsNotInserted(uint256)`,
    );
    await expect(context.genericConsumer.getIsUpkeepAllowed(lot)).to.be.revertedWith(
      `GenericConsumer__LotIsNotInserted(uint256)`,
    );
    // await expect(context.genericConsumer.connect(signers.owner).getEntry(lot, key0)).to.be.revertedWith(
    //   `GenericConsumer__LotIsNotInserted(${lot})`,
    // );
    // await expect(context.genericConsumer.getLastRequestTimestamp(lot, key0)).to.be.revertedWith(
    //   `GenericConsumer__LotIsNotInserted(${lot})`,
    // );
    // await expect(context.genericConsumer.getIsUpkeepAllowed(lot)).to.be.revertedWith(
    //     `GenericConsumer__LotIsNotInserted(${lot})`,
    //   );
  });

  it(`performs the cleaning tasks after removing the lot (maps don't restore the old values)`, async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key) as EntryConverted;
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides);
    await context.genericConsumer
      .connect(signers.owner)
      .setLastRequestTimestamp(lot, key, BigNumber.from("1652354650"));
    await context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, true, overrides);

    // Act
    // Remove the lot and insert Entry 0 again (re-create the lot)
    await context.genericConsumer.connect(signers.owner).removeEntries(lot, [key], overrides);
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides);

    // Assert
    expect(await context.genericConsumer.getLotIsInserted(lot)).to.be.true;
    expect(await context.genericConsumer.getLots()).to.have.lengthOf(1);
    expect(await context.genericConsumer.getLastRequestTimestamp(lot, key)).to.equal(0);
    expect(await context.genericConsumer.getIsUpkeepAllowed(lot)).to.be.false;
  });
}
