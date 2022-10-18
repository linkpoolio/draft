import type { Fixture } from "ethereum-waffle";
import type { Wallet } from "ethers";
import { ethers } from "hardhat";

import type {
  GenericConsumer,
  GenericFulfillmentTestHelper,
  LinkToken,
  Operator,
  ToolsChainlinkTestHelper,
} from "../../../../src/types";
import { MIN_GAS_LIMIT_PERFORM_UPKEEP } from "../../../../tasks/draft/generic-consumer/constants";
import type { Entry, EntryConverted } from "../../../../tasks/draft/generic-consumer/types";
import { getHDWalletSignersConsecutive } from "../../../../utils/signers";
import { testAcceptOwnership } from "./GenericConsumer.acceptOwnership";
import { testAddFunds } from "./GenericConsumer.addFunds";
import { testCancelRequest } from "./GenericConsumer.cancelRequest";
import { testCheckUpkeep } from "./GenericConsumer.checkUpkeep";
import { testEstimateGasCheckUpkeep } from "./GenericConsumer.estimateGas.checkUpkeep";
import { testEstimateGasPerformUpkeep } from "./GenericConsumer.estimateGas.performUpkeep";
import { testFallback } from "./GenericConsumer.fallback";
import { testPerformUpkeep } from "./GenericConsumer.performUpkeep";
import { testRemoveEntries } from "./GenericConsumer.removeEntries";
import { testRemoveEntry } from "./GenericConsumer.removeEntry";
import { testRemoveLot } from "./GenericConsumer.removeLot";
import { testRequestData } from "./GenericConsumer.requestData";
import { testRequestDataAndForwardResponse } from "./GenericConsumer.requestDataAndForwardResponse";
import { testSetDescription } from "./GenericConsumer.setDescription";
import { testSetEntries } from "./GenericConsumer.setEntries";
import { testSetEntry } from "./GenericConsumer.setEntry";
import { testSetIsUpkeepAllowed } from "./GenericConsumer.setIsUpkeepAllowed";
import { testSetLastRequestTimestamp } from "./GenericConsumer.setLastRequestTimestamp";
import { testSetLastRequestTimestamps } from "./GenericConsumer.setLastRequestTimestamps";
import { testSetLatestRoundId } from "./GenericConsumer.setLatestRoundId";
import { testSetMinGasLimitPerformUpkeep } from "./GenericConsumer.setMinGasLimitPerformUpkeep";
import { testTransferOwnership } from "./GenericConsumer.transferOwnership";
import { testWithdrawFunds } from "./GenericConsumer.withdrawFunds";

export interface Context {
  genericConsumer: GenericConsumer;
  genericFulfillmentTestHelper: GenericFulfillmentTestHelper;
  linkToken: LinkToken;
  operator: Operator;
  entries: Entry[];
  entryConvertedMap: Map<string, EntryConverted>;
  toolsChainlinkTestHelper: ToolsChainlinkTestHelper;
  loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
}

export interface Signers {
  deployer: Wallet;
  externalCaller: Wallet;
  operatorSender: Wallet;
  owner: Wallet;
}

describe("GenericConsumer", () => {
  if (new Set(["1", "true"]).has(process.env.HARDHAT_FORKING_ENABLED as string)) {
    throw new Error(
      `Disable the forking mode. Set HARDHAT_FORKING_ENABLED env var to false before running the test suite`,
    );
  }
  let oldEnv: NodeJS.ProcessEnv;
  const signers = {} as Signers;
  const context = {} as Context;

  before(async function () {
    // Back-up env variables just in case
    oldEnv = process.env;

    // Signers
    const mnemonic = "test test test test test test test test test test test junk";
    const hdwalletSigners = getHDWalletSignersConsecutive(mnemonic, 6);
    signers.deployer = hdwalletSigners[0].connect(ethers.provider);
    signers.externalCaller = hdwalletSigners[1].connect(ethers.provider);
    signers.operatorSender = hdwalletSigners[2].connect(ethers.provider);
    signers.owner = hdwalletSigners[3].connect(ethers.provider);

    // Deploy LinkToken
    const linkTokenFactory = await ethers.getContractFactory("LinkToken");
    const linkToken = (await linkTokenFactory.connect(signers.deployer).deploy()) as LinkToken;
    await linkToken.deployTransaction.wait();
    context.linkToken = linkToken;

    // Deploy & setup Operator
    const operatorFactory = await ethers.getContractFactory("Operator");
    const operator = (await operatorFactory
      .connect(signers.deployer)
      .deploy(linkToken.address, signers.deployer.address)) as Operator;
    await operator.deployTransaction.wait();
    context.operator = operator;
    await context.operator.connect(signers.deployer).setAuthorizedSenders([signers.operatorSender.address]);

    // Deploy ToolsChainlinkTestHelper
    // NB: use Chainlink.sol library on the hardhat network
    const toolsChainlinkTestHelperFactory = await ethers.getContractFactory("ToolsChainlinkTestHelper");
    const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;
    context.toolsChainlinkTestHelper = toolsChainlinkTestHelper;

    // Deploy GenericConsumer
    const descriptionGC = "Testing GenericConsumer";
    const genericConsumerFactory = await ethers.getContractFactory("GenericConsumer");
    const genericConsumer = (await genericConsumerFactory.deploy(
      context.linkToken.address,
      descriptionGC,
      MIN_GAS_LIMIT_PERFORM_UPKEEP,
    )) as GenericConsumer;
    await genericConsumer.deployTransaction.wait();
    context.genericConsumer = genericConsumer;
    // Transfer its ownership
    await context.genericConsumer.connect(signers.deployer).transferOwnership(signers.owner.address);
    await context.genericConsumer.connect(signers.owner).acceptOwnership();

    // Deploy GenericFulfillmentTestHelper
    const genericFulfillmentTestHelperFactory = await ethers.getContractFactory("GenericFulfillmentTestHelper");
    const genericFulfillmentTestHelper =
      (await genericFulfillmentTestHelperFactory.deploy()) as GenericFulfillmentTestHelper;
    await genericFulfillmentTestHelper.deployTransaction.wait();
    context.genericFulfillmentTestHelper = genericFulfillmentTestHelper;
  });

  after(async function () {
    process.env = oldEnv;
  });

  describe("acceptOwnership()", () => testAcceptOwnership(signers, context));
  describe("addFunds()", () => testAddFunds(signers, context));
  describe("cancelRequest()", () => testCancelRequest(signers, context));
  describe("checkUpkeep()", () => testCheckUpkeep(signers, context));
  describe("fallback()", () => testFallback(signers, context));
  describe("performUpkeep()", () => testPerformUpkeep(signers, context));
  describe("requestDataAndForwardResponse()", () => testRequestDataAndForwardResponse(signers, context));
  describe("requestData()", () => testRequestData(signers, context));
  describe("removeEntry()", () => testRemoveEntry(signers, context));
  describe("removeEntries()", () => testRemoveEntries(signers, context));
  describe("removeLot()", () => testRemoveLot(signers, context));
  describe("setDescription()", () => testSetDescription(signers, context));
  describe("setEntries()", () => testSetEntries(signers, context));
  describe("setEntry()", () => testSetEntry(signers, context));
  describe("setIsUpkeepAllowed()", () => testSetIsUpkeepAllowed(signers, context));
  describe("setLastRequestTimestamp()", () => testSetLastRequestTimestamp(signers, context));
  describe("setLastRequestTimestamps()", () => testSetLastRequestTimestamps(signers, context));
  describe("setLatestRoundId", () => testSetLatestRoundId(signers, context));
  describe("setMinGasLimitPerformUpkeep", () => testSetMinGasLimitPerformUpkeep(signers, context));
  describe("transferOwnership()", () => testTransferOwnership(signers, context));
  describe("withdrawFunds()", () => testWithdrawFunds(signers, context));
  // TODO: move into a different test suite
  describe.skip("estimate gas checkUpkeep()", () => testEstimateGasCheckUpkeep(signers, context));
  describe.skip("estimate gas performUpkeep()", () => testEstimateGasPerformUpkeep(signers, context));
});
