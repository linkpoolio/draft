import { expect } from "chai";

import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testSetLatestRoundId(signers: Signers, context: Context): void {
  const overrides: Overrides = {};
  let snapshotId: string;

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when the caller is not the owner", async function () {
    // Arrange
    const latestRoundId = 777;

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).setLatestRoundId(latestRoundId),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("sets the minGasLimitPerformUpkeep", async function () {
    // Arrange
    const latestRoundId = 777;

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).setLatestRoundId(latestRoundId, overrides))
      .to.emit(context.genericConsumer, "LatestRoundIdSet")
      .withArgs(latestRoundId);
    expect(await context.genericConsumer.getLatestRoundId()).to.equal(latestRoundId);
  });
}
