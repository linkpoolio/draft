import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { BetterSet } from "../../../../libs/better-set";
import { addEntries, getEntryConvertedMap, parseEntriesFile } from "../../../../tasks/draft/generic-consumer/methods";
import { keepersPerformGasLimit } from "../../../../utils/chainlink-constants";
import { ChainId } from "../../../../utils/constants";
import type { Overrides } from "../../../../utils/types";
import { revertToSnapshot, takeSnapshot } from "../../../helpers/snapshot";
import type { Context, Signers } from "./GenericConsumer";

export function testEstimateGasPerformUpkeep(signers: Signers, context: Context): void {
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

  it("performs an upkeep", async function () {
    // Arrange
    const noEntries = 36;
    const entries = parseEntriesFile(path.join(filePath, "performupkeep-estimate-gas.json"));
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
    const totalPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, totalPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, totalPayment);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act
    const gasEstimate = await context.genericConsumer
      .connect(signers.owner)
      .estimateGas.performUpkeep(performData, overridesPerformUpkeep);

    // Assert
    expect(gasEstimate.lte(keepersPerformGasLimit.get(ChainId.HARDHAT) as BigNumber)).to.be.true;
  });

  it("performs an upkeep for external requests", async function () {
    // Arrange
    const noEntries = 27;
    const entries = parseEntriesFile(path.join(filePath, "performupkeep-estimate-gas.json"));
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
    const totalPayment = [...entryConvertedMap.values()]
      .map(entryConverted => entryConverted.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, totalPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, totalPayment);
    const performData = ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32[]"], [lot, keys]);

    // Act
    const gasEstimate = await context.genericConsumer
      .connect(signers.owner)
      .estimateGas.performUpkeep(performData, overridesPerformUpkeep);

    // Assert
    expect(gasEstimate.lte(keepersPerformGasLimit.get(ChainId.HARDHAT) as BigNumber)).to.be.true;
  });
}
