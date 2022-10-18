import { expect } from "chai";
import { BigNumber } from "ethers";

import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testWithdrawFunds(signers: Signers, context: Context): void {
  let snapshotId: string;

  beforeEach(async function () {
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("reverts when the caller's balance is not enough (caller is GenericConsumer's owner)", async function () {
    // Arrange
    const amount = BigNumber.from("1");

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.owner).withdrawFunds(signers.externalCaller.address, amount),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${context.genericConsumer.address}", 0, ${amount})`,
    );
  });

  it("reverts when the caller's balance is not enough (caller is not GenericConsumer's owner)", async function () {
    // Arrange
    const amount = BigNumber.from("1");

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).withdrawFunds(signers.externalCaller.address, amount),
    ).to.be.revertedWith(
      `GenericConsumer__LinkBalanceIsInsufficient("${signers.externalCaller.address}", 0, ${amount})`,
    );
  });

  it("withdraws the LINK from the GenericConsumer's balance (caller is GenericConsumer's owner)", async function () {
    // Arrange
    // 1. Fund GenericConsumer's balances
    const amount = BigNumber.from("1");
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, amount);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, amount);
    // 2. Get owner, deployer, externalCaller, and GenericConsumer balances before
    const deployerLinkBalanceBefore = await context.linkToken.balanceOf(signers.deployer.address);
    const ownerLinkBalanceBefore = await context.linkToken.balanceOf(signers.owner.address);
    const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    const externalCallerLinkBalanceBefore = await context.linkToken.balanceOf(signers.externalCaller.address);
    const deployerBalanceBefore = await context.genericConsumer.availableFunds(signers.deployer.address);
    const ownerBalanceBefore = await context.genericConsumer.availableFunds(signers.owner.address);
    const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(context.genericConsumer.address);
    const externalCallerBalanceBefore = await context.genericConsumer.availableFunds(signers.externalCaller.address);

    // Act & Assert
    await expect(context.genericConsumer.connect(signers.owner).withdrawFunds(signers.externalCaller.address, amount))
      .to.emit(context.genericConsumer, "FundsWithdrawn")
      .withArgs(context.genericConsumer.address, signers.externalCaller.address, amount);
    // Check LINK balances in the LinkToken contract
    expect(await context.linkToken.balanceOf(signers.deployer.address)).to.equal(deployerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(signers.owner.address)).to.equal(ownerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
      genericConsumerLinkBalanceBefore.sub(amount),
    );
    expect(await context.linkToken.balanceOf(signers.externalCaller.address)).to.equal(
      externalCallerLinkBalanceBefore.add(amount),
    );
    // Check LINK balances in the GenericConsumer contract
    expect(await context.genericConsumer.availableFunds(signers.deployer.address)).to.equal(deployerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(signers.owner.address)).to.equal(ownerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
      genericConsumerBalanceBefore.sub(amount),
    );
    expect(await context.genericConsumer.availableFunds(signers.externalCaller.address)).to.equal(
      externalCallerBalanceBefore,
    );
  });

  it("withdraws the LINK from the GenericConsumer's balance (caller is not GenericConsumer's owner)", async function () {
    // Arrange
    // 1. Fund GenericConsumer's balances
    const amount = BigNumber.from("1");
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, amount);
    await context.genericConsumer.connect(signers.deployer).addFunds(signers.externalCaller.address, amount);
    // 2. Get owner, deployer, externalCaller, and GenericConsumer balances before
    const deployerLinkBalanceBefore = await context.linkToken.balanceOf(signers.deployer.address);
    const ownerLinkBalanceBefore = await context.linkToken.balanceOf(signers.owner.address);
    const genericConsumerLinkBalanceBefore = await context.linkToken.balanceOf(context.genericConsumer.address);
    const externalCallerLinkBalanceBefore = await context.linkToken.balanceOf(signers.externalCaller.address);
    const deployerBalanceBefore = await context.genericConsumer.availableFunds(signers.deployer.address);
    const ownerBalanceBefore = await context.genericConsumer.availableFunds(signers.owner.address);
    const genericConsumerBalanceBefore = await context.genericConsumer.availableFunds(context.genericConsumer.address);
    const externalCallerBalanceBefore = await context.genericConsumer.availableFunds(signers.externalCaller.address);

    // Act & Assert
    await expect(
      context.genericConsumer.connect(signers.externalCaller).withdrawFunds(signers.externalCaller.address, amount),
    )
      .to.emit(context.genericConsumer, "FundsWithdrawn")
      .withArgs(signers.externalCaller.address, signers.externalCaller.address, amount);
    // Check LINK balances in the LinkToken contract
    expect(await context.linkToken.balanceOf(signers.deployer.address)).to.equal(deployerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(signers.owner.address)).to.equal(ownerLinkBalanceBefore);
    expect(await context.linkToken.balanceOf(context.genericConsumer.address)).to.equal(
      genericConsumerLinkBalanceBefore.sub(amount),
    );
    expect(await context.linkToken.balanceOf(signers.externalCaller.address)).to.equal(
      externalCallerLinkBalanceBefore.add(amount),
    );
    // Check LINK balances in the GenericConsumer contract
    expect(await context.genericConsumer.availableFunds(signers.deployer.address)).to.equal(deployerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(signers.owner.address)).to.equal(ownerBalanceBefore);
    expect(await context.genericConsumer.availableFunds(context.genericConsumer.address)).to.equal(
      genericConsumerBalanceBefore,
    );
    expect(await context.genericConsumer.availableFunds(signers.externalCaller.address)).to.equal(
      externalCallerBalanceBefore.sub(amount),
    );
  });
}
