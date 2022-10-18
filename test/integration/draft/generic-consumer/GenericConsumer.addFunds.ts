import { expect } from "chai";
import { BigNumber } from "ethers";

import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testAddFunds(signers: Signers, context: Context): void {
  let snapshotId: string;

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when the consumer is the owner", async function () {
    // Arrange, Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).addFunds(signers.owner.address, BigNumber.from("1")),
    ).to.be.revertedWith(`GenericConsumer__ConsumerAddrIsOwner("${signers.owner.address}")`);
  });

  it("reverts when the caller's allowance is not enough", async function () {
    // Arrange
    const amount = BigNumber.from("2");
    const allowance = amount.sub("1");
    await context.linkToken.connect(signers.externalCaller).approve(context.genericConsumer.address, allowance);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).addFunds(signers.externalCaller.address, amount),
    ).to.be.revertedWith(
      `GenericConsumer__LinkAllowanceIsInsufficient("${signers.externalCaller.address}", ${allowance}, ${amount})`,
    );
  });

  it("reverts when the caller's balance is not enough", async function () {
    // Arrange
    const amount = BigNumber.from("1");
    await context.linkToken.connect(signers.externalCaller).approve(context.genericConsumer.address, amount);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).addFunds(signers.externalCaller.address, amount),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${signers.externalCaller.address}", 0, ${amount})`,
    );
  });

  it("funds the consumer's LINK balance (consumer is GenericConsumer)", async function () {
    // Arrange
    const amount = BigNumber.from("1");
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, amount);
    const deployerLinkBalanceBefore = await context.linkToken.balanceOf(signers.deployer.address);
    const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    const deployerBalanceBefore = await context.genericConsumer.availableFunds(signers.deployer.address);
    const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(context.genericConsumer.address);

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, amount))
      .to.emit(context.genericConsumer, "FundsAdded")
      .withArgs(signers.deployer.address, context.genericConsumer.address, amount);
    // Check LINK balances in the LinkToken contract
    expect(await context.linkToken.balanceOf(signers.deployer.address)).to.equal(deployerLinkBalanceBefore.sub(amount));
    expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
      genericConsumerLinkBalanceBefore.add(amount),
    );
    // Check LINK balances in the GenericConsumer contract
    expect(await context.genericConsumer.availableFunds(signers.deployer.address)).to.equal(deployerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
      genericConsumerBalanceBefore.add(amount),
    );
  });

  it("funds the consumer's LINK balance (consumer is not GenericConsumer)", async function () {
    // Arrange
    const amount = BigNumber.from("1");
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, amount);
    const deployerLinkBalanceBefore = await context.linkToken.balanceOf(signers.deployer.address);
    const externalCallerLinkBalanceBefore = await context.linkToken.balanceOf(signers.externalCaller.address);
    const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    const deployerBalanceBefore = await context.genericConsumer.availableFunds(signers.deployer.address);
    const externalCallerBalanceBefore = await context.genericConsumer.availableFunds(signers.externalCaller.address);
    const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(context.genericConsumer.address);
    // Act & Assert
    await expect(context.genericConsumer.connect(signers.deployer).addFunds(signers.externalCaller.address, amount))
      .to.emit(context.genericConsumer, "FundsAdded")
      .withArgs(signers.deployer.address, signers.externalCaller.address, amount);
    // Check LINK balances in the LinkToken contract
    expect(await context.linkToken.balanceOf(signers.deployer.address)).to.equal(deployerLinkBalanceBefore.sub(amount));
    expect(await context.linkToken.balanceOf(signers.externalCaller.address)).to.equal(externalCallerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
      genericConsumerLinkBalanceBefore.add(amount),
    );
    // Check LINK balances in the GenericConsumer contract
    expect(await context.genericConsumer.availableFunds(signers.deployer.address)).to.equal(deployerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(signers.externalCaller.address)).to.equal(
      externalCallerBalanceBefore.add(amount),
    );
    expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
      genericConsumerBalanceBefore,
    );
  });
}
