import { expect } from "chai";
import { BigNumber } from "ethers";
import hardhat from "hardhat";
import { ethers } from "hardhat";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

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
import type { Context, Signers } from "./GenericConsumer";

export function testEstimateGasCheckUpkeep(signers: Signers, context: Context): void {
  const filePath = path.resolve(__dirname, "draft-entries");
  const overrides: Overrides = {};
  const overridesCheckUpkeep: Overrides = {};
  const lot = BigNumber.from("1");
  let checkData: string;
  let snapshotId: string;

  beforeEach(async function () {
    checkData = ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [lot, signers.owner.address]);
    overridesCheckUpkeep.gasLimit = keepersCheckGasLimit.get(ChainId.HARDHAT);
    snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(snapshotId);
  });

  it("needs an upkeep", async function () {
    // Arrange
    const noEntries = 215;
    const entries = parseEntriesFile(path.join(filePath, "checkupkeep-estimate-gas.json"));
    // Overwrite 'requestData.externalJobId' with UUIDs
    const extendedEntries = [...Array(noEntries)].map(() => {
      const entry = JSON.parse(JSON.stringify(entries[0]));
      entry.requestData.externalJobId = uuidv4();
      return entry;
    });
    await setCodeOnEntryContractAddresses(hardhat, extendedEntries);
    const entryConvertedMap = await getEntryConvertedMap(extendedEntries, context.toolsChainlinkTestHelper);
    await addEntries(
      context.genericConsumer,
      signers.owner,
      lot,
      entryConvertedMap,
      new BetterSet([...entryConvertedMap.keys()]),
      true,
      overrides,
      50,
    );
    const totalPayment = [...entryConvertedMap.values()]
      .map(entry => entry.payment)
      .reduce((totalPayment: BigNumber, payment: BigNumber) => totalPayment.add(payment));
    await context.linkToken.connect(signers.deployer).approve(context.genericConsumer.address, totalPayment);
    await context.genericConsumer.connect(signers.deployer).addFunds(context.genericConsumer.address, totalPayment);

    // Act
    const gasEstimate = await context.genericConsumer
      .connect(ethers.constants.AddressZero)
      .estimateGas.checkUpkeep(checkData, overridesCheckUpkeep);

    // Assert
    expect(gasEstimate.lte(keepersCheckGasLimit.get(ChainId.HARDHAT) as BigNumber)).to.be.true;
  });
}
