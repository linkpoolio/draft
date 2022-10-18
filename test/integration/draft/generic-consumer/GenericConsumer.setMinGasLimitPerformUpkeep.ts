import { expect } from "chai";

import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testSetMinGasLimitPerformUpkeep(signers: Signers, context: Context): void {
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
    const minGasLimitPerformUpkeep = 500_000;

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).setMinGasLimitPerformUpkeep(minGasLimitPerformUpkeep),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("sets the minGasLimitPerformUpkeep", async function () {
    // Arrange
    const minGasLimitPerformUpkeep = 500_000;

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).setMinGasLimitPerformUpkeep(minGasLimitPerformUpkeep, overrides),
    )
      .to.emit(context.genericConsumer, "MinGasLimitPerformUpkeepSet")
      .withArgs(minGasLimitPerformUpkeep);
    expect(await context.genericConsumer.getMinGasLimitPerformUpkeep()).to.equal(minGasLimitPerformUpkeep);
  });
}
