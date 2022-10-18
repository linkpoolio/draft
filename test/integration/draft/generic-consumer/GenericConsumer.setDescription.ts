import { expect } from "chai";

import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testSetDescription(signers: Signers, context: Context): void {
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
    const description = "OK;LG";

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).setDescription(description),
    ).to.be.revertedWith("Only callable by owner");
  });

  it("sets the description", async function () {
    // Arrange
    const description = "OK;LG";

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).setDescription(description, overrides))
      .to.emit(context.genericConsumer, "DescriptionSet")
      .withArgs(description);
    expect(await context.genericConsumer.getDescription()).to.equal(description);
  });
}
