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

export function testSetIsUpkeepAllowed(signers: Signers, context: Context): void {
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
    const lot = 1;
    const isUpkeepAllowed = true;

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).setIsUpkeepAllowed(lot, isUpkeepAllowed),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("does not revert when GenericConsumer is paused", async function () {
    // Arrange
    const lot = 1;
    const isUpkeepAllowed = true;
    await context.genericConsumer.connect(signers.owner).pause();

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, isUpkeepAllowed),
    ).to.not.be.revertedWith("Pausable: paused");
  });

  it(`reverts when the lot is not inserted`, async function () {
    // Arrange
    const lot = 1;
    const isUpkeepAllowed = true;

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, isUpkeepAllowed),
    ).to.be.revertedWith(`GenericConsumer__LotIsNotInserted(${lot})`);
  });

  it("sets the isUpkeepAllowed", async function () {
    // Arrange
    const entries = parseEntriesFile(path.join(filePath, "file1.json"));
    await setCodeOnEntryContractAddresses(hardhat, entries);
    const entryConvertedMap = await getEntryConvertedMap(entries, context.toolsChainlinkTestHelper);
    const [key] = [...entryConvertedMap.keys()];
    const entryConverted = entryConvertedMap.get(key) as EntryConverted;
    await context.genericConsumer.connect(signers.owner).setEntry(lot, key, entryConverted, overrides);
    const isUpkeepAllowed = true;

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).setIsUpkeepAllowed(lot, isUpkeepAllowed, overrides))
      .to.emit(context.genericConsumer, "IsUpkeepAllowedSet")
      .withArgs(lot, isUpkeepAllowed);
    expect(await context.genericConsumer.getIsUpkeepAllowed(lot)).to.be.true;
  });
}
