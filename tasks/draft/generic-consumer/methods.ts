import type { ContractReceipt, ContractTransaction } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ethers } from "ethers";
import { readFileSync } from "fs";
import type { HardhatRuntimeEnvironment, HttpNetworkUserConfig, TaskArguments } from "hardhat/types";
import path from "path";

import { BetterSet } from "../../../libs/better-set";
import type { GenericConsumer, LinkToken, ToolsChainlinkTestHelper } from "../../../src/types";
import { convertFunctionNametoSignature } from "../../../utils/abi";
import { convertJobIdToBytes32, convertRequestParamsToCborBuffer, getLinkBalanceOf } from "../../../utils/chainlink";
import { RequestParamType, keepersCheckGasLimit, keepersPerformGasLimit } from "../../../utils/chainlink-constants";
import type { ChainlinkRequestParam } from "../../../utils/chainlink-types";
import { ChainId } from "../../../utils/constants";
import { getOverrides, isAddressAContract } from "../../../utils/deployment";
import { formatNumericEnumValuesPretty } from "../../../utils/enums";
import { impersonateAccount, setAddressBalance, setAddressCode } from "../../../utils/hre";
import { logger as parentLogger } from "../../../utils/logger";
import { networkUserConfigs } from "../../../utils/networks";
import { reSemVer, reUUID } from "../../../utils/regex";
import { getWalletSignerConnected } from "../../../utils/signers";
import type { Overrides } from "../../../utils/types";
import { setChainVerifyApiKeyEnv } from "../../../utils/verification";
import { checkPrivateKey } from "../methods";
import {
  ChainlinkNodeId,
  DUMMY_SET_CODE_BYTES,
  ExternalAdapterId,
  MIN_GAS_LIMIT_PERFORM_UPKEEP,
  RequestType,
  TaskExecutionMode,
  TaskSetName,
} from "./constants";
import type {
  Description,
  Entry,
  EntryConverted,
  ExternalAdapter,
  GenericConsumerLogConfig,
  RequestData,
  RequestDataConverted,
  Schedule,
  TaskSetData,
} from "./types";

const logger = parentLogger.child({ name: path.relative(process.cwd(), __filename) });

export async function addEntries(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  entryConvertedMap: Map<string, EntryConverted>,
  keysToAddSet: Set<string>,
  isBatchMode: boolean,
  overrides: Overrides,
  batchSize?: number,
): Promise<void> {
  logger.info(
    `${
      keysToAddSet.size
        ? `adding GenericConsumer entries in lot ${lot} ...`
        : `no GenericConsumer entries to add in lot ${lot}`
    }`,
  );
  if (!keysToAddSet.size) return;

  const entryToIndexMap = new Map(Array.from([...entryConvertedMap.keys()].entries()).map(([idx, key]) => [key, idx]));
  if (isBatchMode) {
    const keys = [...keysToAddSet];
    const entriesConverted = keys.map(key => entryConvertedMap.get(key) as EntryConverted);
    const chunkSize = batchSize || keys.length;
    for (let i = 0; i < keys.length; i += chunkSize) {
      await setEntries(
        genericConsumer,
        signer,
        lot,
        keys.slice(i, i + chunkSize),
        entriesConverted.slice(i, i + chunkSize),
        overrides,
        `Added in batch (${i}, ${i + chunkSize - 1})`,
        entryToIndexMap,
      );
    }
  } else {
    for (const key of keysToAddSet) {
      const entryConverted = entryConvertedMap.get(key) as EntryConverted;
      await setEntry(genericConsumer, signer, lot, key, entryConverted, overrides, "Added", entryToIndexMap);
    }
  }
}

export async function addFunds(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  consumer: string,
  amount: BigNumber,
  overrides?: Overrides,
): Promise<void> {
  const logObj = { consumer, amount: amount.toString() };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).addFunds(consumer, amount, overrides);
    logger.info(logObj, `addFunds() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `addFunds() failed due to:`);
    throw error;
  }
}

export function checkEntriesIntegrity(entries: Entry[], chainId: ChainId, isJobIdUnique = true): void {
  if (!Array.isArray(entries)) {
    throw new Error(`Invalid entries file data format. Expected an array of Entry items`);
  }
  // Validate entries
  const jsonValues = Object.values(entries);
  // NB: 'isJobIdUnique' mode forces 1 entries file per node
  const jobIdsSet = new Set();
  for (const [idx, { description, requestData, schedule, inactive }] of jsonValues.entries()) {
    try {
      validateDescription(description, chainId);
      validateRequestData(requestData);
      validateSchedule(schedule);
      validateInactive(inactive);
      if (isJobIdUnique && jobIdsSet.has(`${description.jobId}_${description.jobCase}`)) {
        throw new Error(
          `Duplicated '(jobId_jobCase)': ${description.jobId}_${description.jobCase}. 'jobId': ${description.jobId}, 'jobCase': ${description.jobCase}. Keep them unique`,
        );
      }
    } catch (error) {
      throw new Error(`Invalid entry at index ${idx}: ${JSON.stringify(entries[idx])}. Reason: ${error}`);
    }
    if (isJobIdUnique) {
      jobIdsSet.add(`${description.jobId}_${description.jobCase}`);
    }
  }
}

export async function decreaseApprovalLinkTokenPayment(
  linkToken: LinkToken,
  signer: ethers.Wallet | SignerWithAddress,
  spender: string,
  value: BigNumber,
  overrides: Overrides,
): Promise<void> {
  const logObj = { spender, value: value.toString() };
  let tx: ContractTransaction;
  try {
    tx = await linkToken.connect(signer).decreaseApproval(spender, value, overrides);
    logger.info(logObj, `decreaseApproval() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `decreaseApproval() failed due to:`);
    throw error;
  }
}

export async function deleteEntries(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  keysToRemoveSet: Set<string>,
  isBatchMode: boolean,
  overrides: Overrides,
  batchSize?: number,
): Promise<void> {
  logger.info(
    `${
      keysToRemoveSet.size
        ? `deleting GenericConsumer entries in lot ${lot} ...`
        : `no GenericConsumer entries to remove in lot ${lot}`
    }`,
  );
  if (!keysToRemoveSet.size) return;

  if (isBatchMode) {
    const keys = [...keysToRemoveSet];
    const chunkSize = batchSize || keys.length;
    for (let i = 0; i < keys.length; i += chunkSize) {
      await removeEntries(
        genericConsumer,
        signer,
        lot,
        keys.slice(i, i + chunkSize),
        overrides,
        `Removed in batch (${i}, ${i + chunkSize - 1})`,
      );
    }
  } else {
    for (const key of keysToRemoveSet) {
      await removeEntry(genericConsumer, signer, lot, key, overrides);
    }
  }
}

export async function deployGenericConsumerOnHardhat(
  hre: HardhatRuntimeEnvironment,
  signer: ethers.Wallet | SignerWithAddress,
  description: string,
  minGasLimitPerformUpkeep: BigNumber,
  overrides?: Overrides,
): Promise<GenericConsumer> {
  // Deploy LinkToken
  const linkTokenFactory = await hre.ethers.getContractFactory("LinkToken");
  const linkToken = (await linkTokenFactory.connect(signer).deploy()) as LinkToken;
  await linkToken.deployTransaction.wait();

  // Deploy GenericConsumer
  const genericConsumerFactory = await hre.ethers.getContractFactory("GenericConsumer");
  const genericConsumer = (await genericConsumerFactory
    .connect(signer)
    .deploy(linkToken.address, description, minGasLimitPerformUpkeep, overrides)) as GenericConsumer;
  await genericConsumer.deployTransaction.wait();

  return genericConsumer;
}

export function generateEntryKey(specId: string, oracle: string, buffer: string): string {
  return ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32", "address", "bytes"], [specId, oracle, buffer]));
}

export async function getEntryConvertedMap(
  specEntries: Entry[],
  toolsChainlinkTestHelper: ToolsChainlinkTestHelper,
): Promise<Map<string, EntryConverted>> {
  const entryConvertedMap: Map<string, EntryConverted> = new Map();
  for (const [idx, { requestData, schedule, inactive }] of specEntries.entries()) {
    let requestDataConverted: RequestDataConverted;
    try {
      requestDataConverted = await getRequestDataConverted(requestData, toolsChainlinkTestHelper);
    } catch (error) {
      logger.error(
        `unexpected error converting the 'requestData' of the entry at index ${idx}: ${JSON.stringify(
          requestData,
        )}. Reason:`,
      );
      throw error;
    }
    const entryConverted: EntryConverted = {
      ...requestDataConverted,
      startAt: BigNumber.from(schedule.startAt),
      interval: BigNumber.from(schedule.interval),
      inactive,
    };
    entryConvertedMap.set(requestDataConverted.key, entryConverted);
  }
  return entryConvertedMap;
}

export async function getEntryMap(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  keys: string[],
): Promise<Map<string, EntryConverted>> {
  const entryMap: Map<string, EntryConverted> = new Map();
  for (const key of keys) {
    const [
      specId,
      oracle,
      payment,
      callbackAddr,
      startAt,
      interval,
      callbackFunctionSignature,
      inactive,
      requestType,
      buffer,
    ] = await genericConsumer.connect(signer).getEntry(lot, key);
    const entry = {
      key,
      specId,
      oracle,
      payment,
      callbackAddr,
      callbackFunctionSignature,
      requestType,
      buffer,
      startAt,
      interval,
      inactive,
    };
    entryMap.set(key, entry);
  }
  return entryMap;
}

export async function getGenericConsumer(
  hre: HardhatRuntimeEnvironment,
  consumer: string,
  mode: TaskExecutionMode,
  signer?: ethers.Wallet | SignerWithAddress,
  overrides?: Overrides,
): Promise<GenericConsumer> {
  let genericConsumer: GenericConsumer;
  if (mode === TaskExecutionMode.DRYRUN) {
    if (!signer || !overrides) {
      throw new Error(
        `Missing 'signer' and/or 'overrides' on mode: ${mode}. Signer: ${JSON.stringify(
          signer,
        )} | Overrides: ${JSON.stringify(overrides)}`,
      );
    }
    genericConsumer = await deployGenericConsumerOnHardhat(
      hre,
      signer,
      "GenericConsumer for dry run mode on hardhat",
      MIN_GAS_LIMIT_PERFORM_UPKEEP,
      overrides,
    );
  } else if (new Set([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]).has(mode)) {
    // Get GenericConsumer contract at address
    const genericConsumerArtifact = await hre.artifacts.readArtifact("GenericConsumer");
    // NB: Do not use hre.ethers.getContractAt() even with signer, it always be connected to the Hardhat network!!
    genericConsumer = new hre.ethers.Contract(consumer, genericConsumerArtifact.abi, signer) as GenericConsumer;

    // Check if the contract exists at address
    if (!isAddressAContract(genericConsumer)) {
      const chainId = await signer?.getChainId();
      throw new Error(
        `Unable to find ${genericConsumerArtifact.contractName} on network ${chainId} at address ${consumer}`,
      );
    }
  } else {
    throw new Error(`Unsupported 'mode': ${mode}`);
  }

  return genericConsumer;
}

export async function getIsUpkeepAllowedMap(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lots: BigNumber[],
): Promise<Map<string, boolean>> {
  const isUpkeepAllowedMap: Map<string, boolean> = new Map([]);
  for (const lot of lots) {
    const isUpkeepAllowed = await genericConsumer.connect(signer).getIsUpkeepAllowed(lot);
    isUpkeepAllowedMap.set(lot.toString(), isUpkeepAllowed);
  }
  return isUpkeepAllowedMap;
}

export async function getRequestDataConverted(
  requestData: RequestData,
  toolsChainlinkTestHelper: ToolsChainlinkTestHelper,
): Promise<RequestDataConverted> {
  const specId = convertJobIdToBytes32(requestData.externalJobId);
  const oracle = requestData.oracleAddr;
  const payment = BigNumber.from(requestData.payment);
  const callbackAddr = requestData.callbackAddr;
  const callbackFunctionSignature = convertFunctionNametoSignature(requestData.callbackFunctionName);
  const requestType = requestData.requestType;
  let buffer: string;
  try {
    buffer = await convertRequestParamsToCborBuffer(toolsChainlinkTestHelper, requestData.requestParams);
  } catch (error) {
    logger
      .child(requestData.requestParams)
      .error(error, `Unexpected error encoding the 'requestParams' to CBOR. Reason:`);
    throw error;
  }
  const key = generateEntryKey(specId, oracle, buffer);

  return {
    key,
    specId,
    oracle,
    payment,
    callbackAddr,
    callbackFunctionSignature,
    requestType,
    buffer,
  };
}

export function hasEntryDifferences(entry: EntryConverted, consumerEntry: EntryConverted): boolean {
  return (
    !entry.payment.eq(consumerEntry.payment) ||
    entry.callbackAddr !== consumerEntry.callbackAddr ||
    entry.callbackFunctionSignature !== consumerEntry.callbackFunctionSignature ||
    !entry.startAt.eq(consumerEntry.startAt) ||
    !entry.interval.eq(consumerEntry.interval) ||
    entry.inactive != consumerEntry.inactive
  );
}

export async function increaseApprovalLinkTokenPayment(
  linkToken: LinkToken,
  signer: ethers.Wallet | SignerWithAddress,
  spender: string,
  value: BigNumber,
  overrides: Overrides,
): Promise<void> {
  const logObj = { spender, value: value.toString() };
  let tx: ContractTransaction;
  try {
    tx = await linkToken.connect(signer).increaseApproval(spender, value, overrides);
    logger.info(logObj, `increaseApproval() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `increaseApproval() failed due to:`);
    throw error;
  }
}

// TODO: this log logic currently sets consumer as either the GeneriConsumer address or the signer
// address. Ideally it should receive and use a lot -> consumer map, and determine whether the lot
// needs an upkeep.
export async function logCheckUpkeepGasEstimation(
  chainId: ChainId,
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  consumer: string,
  isUpkeepAllowed: boolean,
): Promise<void> {
  const checkUpkeepGasLimit = keepersCheckGasLimit.get(chainId as ChainId);
  const performUpkeepGasLimit = keepersPerformGasLimit.get(chainId as ChainId);
  // NB: consumer is not dynamic per lot
  const checkData = ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [lot, consumer]);
  const checkUpkeepGasEstimation = await genericConsumer
    .connect(ethers.constants.AddressZero)
    .estimateGas.checkUpkeep(checkData);
  const [isUpkeepNeeded, performData] = await genericConsumer
    .connect(ethers.constants.AddressZero)
    .checkUpkeep(checkData);
  let performUpkeepGasEstimation = BigNumber.from("0");
  let keys: string[] = [];
  if (isUpkeepNeeded) {
    performUpkeepGasEstimation = await genericConsumer.connect(signer).estimateGas.performUpkeep(performData);
    [lot, keys] = ethers.utils.defaultAbiCoder.decode(["uint256", "bytes32[]"], performData);
  }
  const lotUpkeep = {
    isUpkeepAllowed,
    checkGasLimit: checkUpkeepGasLimit?.toString(),
    "checkUpkeep estimated gas": checkUpkeepGasEstimation.toString(),
    performGasLimit: performUpkeepGasLimit?.toString(),
    "performUpkeep estimated gas": isUpkeepNeeded ? performUpkeepGasEstimation.toString() : "-",
    isUpkeepNeeded: isUpkeepNeeded,
    performData: performData,
    "performData (decoded)": keys,
  };
  if (!checkUpkeepGasLimit) {
    logger.warn(lotUpkeep, `lot ${lot} Keepers (network checkGasLimit not found):`);
  } else if (checkUpkeepGasEstimation.gt(checkUpkeepGasLimit)) {
    logger.error(lotUpkeep, `lot ${lot} Keepers (above checkGasLimit):`);
  } else {
    logger.info(lotUpkeep, `lot ${lot} Keepers:`);
  }
}

export async function logGenericConsumerDetail(
  hre: HardhatRuntimeEnvironment,
  genericConsumer: GenericConsumer,
  logConfig: GenericConsumerLogConfig,
  signer: ethers.Wallet | SignerWithAddress,
): Promise<void> {
  if (logConfig.detail) {
    const address = genericConsumer.connect(signer).address;
    const typeAndVersion = await genericConsumer.connect(signer).typeAndVersion();
    const description = await genericConsumer.connect(signer).getDescription();
    const owner = await genericConsumer.connect(signer).owner();
    const paused = await genericConsumer.connect(signer).paused();
    const minGasLimitPerformUpkeep = await genericConsumer.connect(signer).getMinGasLimitPerformUpkeep();
    const lots = await genericConsumer.connect(signer).getLots();
    const latestRoundId = await genericConsumer.connect(signer).getLatestRoundId();
    const addressLink = await genericConsumer.connect(signer).LINK();
    const linkBalance = await getLinkBalanceOf(hre, signer, genericConsumer.address, addressLink);
    const linkBalanceOwner = await genericConsumer.connect(signer).availableFunds(address);
    const linkBalanceSigner = await genericConsumer.connect(signer).availableFunds(signer.address);
    const isUpkeepAllowedMap = await getIsUpkeepAllowedMap(genericConsumer, signer, lots);
    logger.info(
      {
        address: address,
        typeAndVersion: typeAndVersion,
        description: description,
        owner: owner,
        paused: paused,
        LINK: addressLink,
        balances: {
          TOTAL: `${ethers.utils.formatUnits(linkBalance)} LINK`,
          owner: `${ethers.utils.formatUnits(linkBalanceOwner)} LINK`,
          signer: `${ethers.utils.formatUnits(linkBalanceSigner)} LINK`,
        },
        minGasLimitPerformUpkeep: `${minGasLimitPerformUpkeep} gas units`,
        "lots (lot -> isUpkeepAllowed)": Object.fromEntries(isUpkeepAllowedMap),
        latestRoundId: latestRoundId.toString(),
      },
      "detail:",
    );
  }

  if (logConfig.keys) {
    const lots = await genericConsumer.connect(signer).getLots();
    const lotToEntries: Record<string, string[]> = {};
    for (const lot of lots) {
      const keys = await genericConsumer.connect(signer).getEntryMapKeys(lot);
      lotToEntries[lot.toString()] = keys;
    }
    logger.info(lotToEntries, "lot entry keys:");
  }

  if (logConfig.entries) {
    const lots = await genericConsumer.connect(signer).getLots();
    for (const lot of lots) {
      const keys = await genericConsumer.connect(signer).getEntryMapKeys(lot);
      const entryMap = await getEntryMap(genericConsumer, signer, lot, keys);
      logger.info([...entryMap.values()], `lot ${lot} entries:`);
    }
  }

  if (logConfig.lastRequestTimestamps) {
    const lots = await genericConsumer.connect(signer).getLots();
    for (const lot of lots) {
      const keys = await genericConsumer.connect(signer).getEntryMapKeys(lot);
      const keyToLastRequestTimestamp: Record<string, string> = {};
      for (const key of keys) {
        const lastRequestTimestamp = await genericConsumer.connect(signer).getLastRequestTimestamp(lot, key);
        const dateTime = lastRequestTimestamp.isZero()
          ? "-"
          : new Date(lastRequestTimestamp.toNumber() * 1000).toISOString();
        keyToLastRequestTimestamp[key] = dateTime;
      }
      logger.info(keyToLastRequestTimestamp, `lot ${lot} lastRequestTimestamp:`);
    }
  }

  // TODO: this log logic currently sets consumer as either the GeneriConsumer address or the signer
  // address. Ideally it should receive and use a lot -> consumer map, and determine whether the lot
  // needs an upkeep.
  if (logConfig.keepers) {
    const owner = await genericConsumer.connect(signer).owner(); // TODO: improve this
    const consumer = owner === signer.address ? genericConsumer.address : signer.address;
    const lots = await genericConsumer.connect(signer).getLots();
    const isUpkeepAllowedMap = await getIsUpkeepAllowedMap(genericConsumer, signer, lots);
    const network = await genericConsumer.provider.getNetwork();
    const chainId = network.chainId;
    for (const lot of lots) {
      await logCheckUpkeepGasEstimation(
        chainId,
        genericConsumer,
        signer,
        lot,
        consumer,
        isUpkeepAllowedMap.get(lot.toString()) as boolean,
      );
    }
  }
}

export async function requestData(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  specId: string,
  oracleAddr: string,
  payment: BigNumber,
  callbackFunctionSignature: string,
  requestType: number,
  buffer: string,
  overrides: Overrides,
): Promise<ContractReceipt> {
  const logObj = { specId, oracleAddr, payment: payment.toString(), callbackFunctionSignature, requestType, buffer };
  let tx: ContractTransaction;
  let receipt: ContractReceipt;
  try {
    tx = await genericConsumer
      .connect(signer)
      .requestData(specId, oracleAddr, payment, callbackFunctionSignature, requestType, buffer, overrides);
    logger.info(logObj, `requestData() | Tx hash: ${tx.hash} | Tx block: ${tx.blockNumber}`);
    receipt = await tx.wait();
    logger.info(`requestData() | receipt block: ${receipt.blockNumber} | receipt blockHash: ${receipt.blockHash}`);
  } catch (error) {
    logger.child(logObj).error(`requestData() failed due to: ${error}`);
    throw error;
  }
  return receipt;
}

export async function requestDataAndForwardResponse(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  specId: string,
  oracleAddr: string,
  payment: BigNumber,
  callbackAddr: string,
  callbackFunctionSignature: string,
  requestType: number,
  buffer: string,
  overrides: Overrides,
): Promise<ContractReceipt> {
  const logObj = {
    specId,
    oracleAddr,
    payment: payment.toString(),
    callbackAddr,
    callbackFunctionSignature,
    requestType,
    buffer,
  };
  let tx: ContractTransaction;
  let receipt: ContractReceipt;
  try {
    tx = await genericConsumer
      .connect(signer)
      .requestDataAndForwardResponse(
        specId,
        oracleAddr,
        payment,
        callbackAddr,
        callbackFunctionSignature,
        requestType,
        buffer,
        overrides,
      );
    logger.info(logObj, `requestDataAndForwardResponse() | Tx hash: ${tx.hash}`);
    receipt = await tx.wait();
    logger.info(
      `requestDataAndForwardResponse() | receipt block: ${receipt.blockNumber} | receipt blockHash: ${receipt.blockHash}`,
    );
  } catch (error) {
    logger.child(logObj).error(error, `requestDataAndForwardResponse() failed due to:`);
    throw error;
  }
  return receipt;
}

export function parseAndCheckEntriesFile(filePath: string, chainId: ChainId): Entry[] {
  // Read and parse the entries JSON file
  const entries = parseEntriesFile(filePath);
  // Validate entries file
  checkEntriesIntegrity(entries, chainId);

  return entries;
}

export function parseEntriesFile(filePath: string): Entry[] {
  let entries: Entry[];
  try {
    entries = JSON.parse(readFileSync(filePath, "utf-8")) as Entry[];
  } catch (error) {
    logger.error(error, `unexpected error reading file: ${filePath}. Make sure the JSON file exists`);
    throw error;
  }

  return entries;
}

export async function pause(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  overrides: Overrides,
): Promise<void> {
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).pause(overrides);
    logger.info(`pause() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.error(error, `pause() failed due to:`);
    throw error;
  }
}

export async function performUpkeep(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  performData: string,
  overrides?: Overrides,
): Promise<ContractReceipt> {
  const logObj = { performData };
  let tx: ContractTransaction;
  let receipt: ContractReceipt;
  try {
    tx = await genericConsumer.connect(signer).performUpkeep(performData, overrides);
    logger.info(logObj, `performUpkeep() | Tx hash: ${tx.hash}`);
    receipt = await tx.wait();
    logger.info(`performUpkeep() | receipt block: ${receipt.blockNumber} | receipt blockHash: ${receipt.blockHash}`);
  } catch (error) {
    logger.child(logObj).error(error, `performUpkeep() failed due to:`);
    throw error;
  }
  return receipt;
}

export async function removeEntries(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  keys: string[],
  overrides: Overrides,
  action = "Removed",
): Promise<void> {
  const logObj = { lot: lot.toString(), keys };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).removeEntries(lot, keys, overrides);
    logger.info(logObj, `removeEntries() ${action} lot ${lot} entries | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `removeEntries() failed due to:`);
    throw error;
  }
}

export async function removeEntry(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  key: string,
  overrides: Overrides,
): Promise<void> {
  const logObj = { lot: lot.toString(), key };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).removeEntry(lot, key, overrides);
    logger.info(logObj, `removeEntry() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `removeEntry() failed due to:`);
    throw error;
  }
}

export async function removeLot(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  overrides: Overrides,
): Promise<void> {
  const logObj = { lot: lot.toString() };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).removeLot(lot, overrides);
    logger.info(logObj, `removeLot() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `removeLot() failed due to:`);
    throw error;
  }
}

export async function setCodeOnEntryContractAddresses(hre: HardhatRuntimeEnvironment, entries: Entry[]): Promise<void> {
  const requestDataList = entries.map((entry: Entry) => entry.requestData);

  let contractAddresses: string[] = [];
  requestDataList.forEach((requestData: RequestData) => {
    contractAddresses = contractAddresses.concat([requestData.oracleAddr, requestData.callbackAddr]);
  });
  for (const address of contractAddresses) {
    await setAddressCode(hre, address, DUMMY_SET_CODE_BYTES);
  }
}

export async function setDescription(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  description: string,
  overrides?: Overrides,
): Promise<void> {
  const logObj = { description };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setDescription(description, overrides);
    logger.info(logObj, `setDescription() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setDescription() failed due to:`);
    throw error;
  }
}

export async function setEntries(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  keys: string[],
  entries: EntryConverted[],
  overrides: Overrides,
  action = "Set",
  entryToIndexMap?: Map<string, number>,
): Promise<void> {
  const indexToKey: Record<number, string> = {};
  if (entryToIndexMap) {
    keys.forEach(key => (indexToKey[entryToIndexMap.get(key) as number] = key));
  }
  const logObj = { action, "file indeces": indexToKey, lot: lot.toString(), keys, entries };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setEntries(lot, keys, entries, overrides);
    logger.info(logObj, `setEntries() ${action} | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setEntries() failed due to:`);
    throw error;
  }
}

export async function setEntry(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  key: string,
  entry: EntryConverted,
  overrides: Overrides,
  action = "Set",
  entryToIndexMap?: Map<string, number>,
): Promise<void> {
  const indexToKey: Record<number, string> = {};
  if (entryToIndexMap) {
    indexToKey[entryToIndexMap.get(key) as number] = key;
  }
  const logObj = { action, "file indeces": indexToKey, lot: lot.toString(), key, entry };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setEntry(lot, key, entry, overrides);
    logger.info(logObj, `setEntry() ${action} | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setEntry() failed due to:`);
    throw error;
  }
}

export async function setIsUpkeepAllowed(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  isUpkeepAllowed: boolean,
  overrides: Overrides,
): Promise<void> {
  const logObj = { lot: lot.toString(), isUpkeepAllowed };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setIsUpkeepAllowed(lot, isUpkeepAllowed, overrides);
    logger.info(logObj, `setIsUpkeepAllowed() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setIsUpkeepAllowed() failed due to:`);
    throw error;
  }
}

export async function setLastRequestTimestamp(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  key: string,
  lastRequestTimestamp: BigNumber,
  overrides: Overrides,
  entryToIndexMap?: Map<string, number>,
): Promise<void> {
  const indexToKey: Record<number, string> = {};
  if (entryToIndexMap) {
    indexToKey[entryToIndexMap.get(key) as number] = key;
  }
  const logObj = {
    "file indeces": indexToKey,
    lot: lot.toString(),
    key,
    lastRequestTimestamp: lastRequestTimestamp.toString(),
  };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setLastRequestTimestamp(lot, key, lastRequestTimestamp, overrides);
    logger.info(logObj, `setLastRequestTimestamp() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setLastRequestTimestamp() failed due to:`);
    throw error;
  }
}

export async function setLastRequestTimestamps(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  keys: string[],
  lastRequestTimestamps: BigNumber[],
  overrides: Overrides,
  entryToIndexMap?: Map<string, number>,
): Promise<void> {
  const indexToKey: Record<number, string> = {};
  if (entryToIndexMap) {
    keys.forEach(key => (indexToKey[entryToIndexMap.get(key) as number] = key));
  }
  const logObj = {
    "file indeces": indexToKey,
    lot: lot.toString(),
    keys,
    lastRequestTimestamps: lastRequestTimestamps.map((lrt: BigNumber) => lrt.toString()),
  };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setLastRequestTimestamps(lot, keys, lastRequestTimestamps, overrides);
    logger.info(logObj, `setLastRequestTimestamps() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setLastRequestTimestamps() failed due to:`);
    throw error;
  }
}

export async function setLatestRoundId(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  latestRoundId: BigNumber,
  overrides: Overrides,
): Promise<void> {
  const logObj = { latestRoundId: latestRoundId.toString() };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setLatestRoundId(latestRoundId, overrides);
    logger.info(logObj, `setLatestRoundId() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setLatestRoundId() failed due to:`);
    throw error;
  }
}

export async function setMinGasLimitPerformUpkeep(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  minGasLimit: BigNumber,
  overrides: Overrides,
): Promise<void> {
  const logObj = { minGasLimit: minGasLimit.toString() };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).setMinGasLimitPerformUpkeep(minGasLimit, overrides);
    logger.info(logObj, `setMinGasLimitPerformUpkeep() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setMinGasLimitPerformUpkeep() failed due to:`);
    throw error;
  }
}

export async function unpause(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  overrides: Overrides,
): Promise<void> {
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).unpause(overrides);
    logger.info(`unpause() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.error(error, `unpause() failed due to:`);
    throw error;
  }
}

export async function setupGenericConsumerAfterDeploy(
  taskArguments: TaskArguments,
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  overrides: Overrides,
) {
  // Transfer ownership
  if (taskArguments.owner) {
    await transferOwnership(genericConsumer, signer, taskArguments.owner as string, overrides);
  }
}

export async function setupTaskSet(
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
  taskName: TaskSetName,
): Promise<TaskSetData> {
  logger.warn(
    `*** Running ${(taskName as string).toUpperCase()} on ${(taskArguments.mode as string).toUpperCase()} mode ***`,
  );
  // NB: this chore must be run on the Hardhat network (localhost)
  const chainId = hre.network.config.chainId as ChainId;
  if (chainId !== ChainId.HARDHAT) {
    throw new Error(
      `Unsupported 'network': ${chainId}. ` +
        `This chore only supports the Hardhat network (chain Id: ${ChainId.HARDHAT}). ` +
        `Run this chore without the network param`,
    );
  }
  // Forking mode checks
  if (taskArguments.mode === TaskExecutionMode.FORKING && !hre.config.networks.hardhat.forking?.enabled) {
    throw new Error(
      `Task 'mode' '${taskArguments.mode}' requires the Hardhat Network forking-config setup and enabled. ` +
        `Please, set HARDHAT_FORKING_ENABLED and your HARDHAT_FORKING_URL in the .env file`,
    );
  }

  // Get the contract method overrides
  const overrides = await getOverrides(taskArguments, hre);

  // Instantiate the signer of the network (non-hardhat)
  checkPrivateKey();
  let netSigner: ethers.Wallet | SignerWithAddress;
  netSigner = getWalletSignerConnected(taskArguments.net, process.env.PRIVATE_KEY as string);
  logger.info(`signer address: ${netSigner.address}`);

  let entries: undefined | Entry[];
  if (new Set([TaskSetName.IMPORT_FILE, TaskSetName.REQUEST_FILE_ENTRY]).has(taskName)) {
    // NB: force each JSON Entry chainId to match taskArgument.net
    const { chainId } = networkUserConfigs.get(taskArguments.net) as HttpNetworkUserConfig;
    // Read and parse the entries JSON file
    logger.info(`parsing and checking entries file: ${taskArguments.filename}.json ...`);
    const filePath = `./jobs/draft-entries/${taskArguments.filename}.json`;
    entries = parseAndCheckEntriesFile(filePath, chainId as ChainId);
  }

  // Execution mode setups
  if (new Set([TaskExecutionMode.DRYRUN, TaskExecutionMode.FORKING]).has(taskArguments.mode)) {
    logger.info(`impersonating signer address: ${netSigner.address} ...`);
    await impersonateAccount(hre, netSigner.address);
    netSigner = await hre.ethers.getSigner(netSigner.address);
  }
  if (taskArguments.mode === TaskExecutionMode.DRYRUN) {
    if (new Set([TaskSetName.IMPORT_FILE, TaskSetName.REQUEST_FILE_ENTRY]).has(taskName)) {
      logger.info("setting code in entries contract addresses ...");
      await setCodeOnEntryContractAddresses(hre, entries as Entry[]);
    }
    const fundingAmount = BigNumber.from("10000000000000000000");
    logger.info(`funding addresses with ${hre.ethers.utils.formatUnits(fundingAmount)} ETH ...`);
    await setAddressBalance(hre, netSigner.address, fundingAmount);
  }

  // Instantiante GenericConsumer either on the network (nodryrun) or on the hardhat network
  logger.info(`connecting to GenericConsumer at: ${taskArguments.address} ...`);
  const genericConsumer = await getGenericConsumer(
    hre,
    taskArguments.address,
    taskArguments.mode,
    netSigner,
    overrides,
  );

  await logGenericConsumerDetail(hre, genericConsumer, { detail: true }, netSigner);

  // Check whether signer is owner
  const owner = await genericConsumer.connect(netSigner).owner();
  if (
    new Set([
      TaskSetName.IMPORT_FILE,
      TaskSetName.REMOVE_LOT,
      TaskSetName.REMOVE_ENTRY,
      TaskSetName.SET_ENTRY,
      TaskSetName.SET_PAUSE,
      TaskSetName.SET_STUFF,
    ]).has(taskName) &&
    owner !== netSigner.address
  ) {
    throw new Error(`Invalid signer: ${owner}. Task ${taskName} requires ownership`);
  }

  return {
    genericConsumer,
    netSigner,
    overrides,
    entries,
  };
}

export async function transferOwnership(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  owner: string,
  overrides?: Overrides,
): Promise<void> {
  const logObj = { owner };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).transferOwnership(owner, overrides);
    logger.info(logObj, `transferOwnership() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `transferOwnership() failed due to:`);
    throw error;
  }
}

export async function updateEntries(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  lot: BigNumber,
  consumerEntryMap: Map<string, EntryConverted>,
  entryConvertedMap: Map<string, EntryConverted>,
  keysToCheckSet: Set<string>,
  isBatchMode: boolean,
  overrides: Overrides,
  batchSize?: number,
): Promise<void> {
  const keysToUpdateSet = new BetterSet<string>();
  // Classify entries to be updated by topic
  for (const key of keysToCheckSet) {
    const consumerEntry = consumerEntryMap.get(key) as EntryConverted;
    const entryConverted = entryConvertedMap.get(key) as EntryConverted;
    if (hasEntryDifferences(entryConverted, consumerEntry)) {
      keysToUpdateSet.add(key);
    }
  }

  // Perform the updates
  logger.info(
    `${
      keysToUpdateSet.size
        ? `updating GenericConsumer entries in lot ${lot} ...`
        : `no GenericConsumer entries to update in lot ${lot}`
    }`,
  );
  if (!keysToUpdateSet.size) return;

  const entryToIndexMap = new Map(Array.from([...entryConvertedMap.keys()].entries()).map(([idx, key]) => [key, idx]));
  if (isBatchMode) {
    const keys = [...keysToUpdateSet];
    const entriesConverted = keys.map(key => entryConvertedMap.get(key) as EntryConverted);
    const chunkSize = batchSize || keys.length;
    for (let i = 0; i < keys.length; i += chunkSize) {
      await setEntries(
        genericConsumer,
        signer,
        lot,
        keys.slice(i, i + chunkSize),
        entriesConverted.slice(i, i + chunkSize),
        overrides,
        `Updated in batch (${i}, ${i + chunkSize - 1})`,
        entryToIndexMap,
      );
    }
  } else {
    for (const key of keysToUpdateSet) {
      const entryConverted = entryConvertedMap.get(key) as EntryConverted;
      await setEntry(genericConsumer, signer, lot, key, entryConverted, overrides, "Updated", entryToIndexMap);
    }
  }
}

function validateExternalAdapter(adapter: null | ExternalAdapter): void {
  if (adapter === null) return;

  // id
  if (!new Set(Object.values(ExternalAdapterId)).has(adapter.id)) {
    throw new Error(`Invalid adapter 'id': ${adapter.id}. Check valid values and consider updating ExternalAdapterId`);
  }

  // version
  if (!reSemVer.test(adapter.version)) {
    throw new Error(`Invalid adapter 'version': ${adapter.version}. Expected format is 'Major.Minor.Patch'`);
  }
}

function validateDescription(description: Description, chainId: ChainId): void {
  // adapter
  validateExternalAdapter(description.adapter);

  // chainId
  if (chainId !== ChainId.HARDHAT && description.chainId !== chainId) {
    throw new Error(`Chain ID conflict. Spec 'chainId': ${description.chainId}. But running chore on: ${chainId}`);
  }
  // jobId
  if (!Number.isInteger(description.jobId) || description.jobId < 0) {
    throw new Error(`Invalid 'jobId': ${description.jobId}. Expected an integer greter or equal than zero`);
  }
  // jobCase
  if (!Number.isInteger(description.jobId) || description.jobId < 0) {
    throw new Error(`Invalid 'jobCase': ${description.jobCase}. Expected an integer greter or equal than zero`);
  }
  // jobName
  if (typeof description.jobName !== "string" || !description.jobName.trim()) {
    throw new Error(`Invalid 'jobName': ${JSON.stringify(description.jobName)}. Required a non-empty string`);
  }
  // nodeId
  if (!new Set(Object.values(ChainlinkNodeId)).has(description.nodeId)) {
    throw new Error(
      `Invalid 'nodeId': ${description.nodeId}. Check valid values and consider updating ChainlinkNodeId`,
    );
  }
  // notes
  if (description.notes !== null && (typeof description.notes !== "string" || !description.notes.trim())) {
    throw new Error(`Invalid 'notes': ${JSON.stringify(description.notes)}. Required null or a non-empty string`);
  }
}

export function validateRequestData(requestData: RequestData): void {
  validateRequestDataExternalJobId(requestData.externalJobId);
  validateRequestDataOracleAddr(requestData.oracleAddr);
  validateRequestDataPayment(requestData.payment);
  validateRequestDataCallbackAddr(requestData.callbackAddr);
  validateRequestDataCallbackFunctionName(requestData.callbackFunctionName);
  validateRequestDataRequestType(requestData.requestType);
  validateRequestDataRequestParams(requestData.requestParams);
}

export function validateRequestDataExternalJobId(externalJobId: string): void {
  if (!reUUID.test(externalJobId)) {
    throw new Error(`Invalid 'externalJobId': ${externalJobId}. Expected format is UUID v4`);
  }
}

export function validateRequestDataOracleAddr(oracleAddr: string): void {
  if (
    !ethers.utils.isAddress(oracleAddr) ||
    oracleAddr !== ethers.utils.getAddress(oracleAddr) ||
    oracleAddr === ethers.constants.AddressZero
  ) {
    throw new Error(
      `Invalid 'oracleAddr': ${oracleAddr}. Expected format is a checksum Ethereum address (can't be the Zero address)`,
    );
  }
}

export function validateRequestDataPayment(payment: string): void {
  if (
    typeof payment !== "string" ||
    !BigNumber.isBigNumber(BigNumber.from(payment)) ||
    BigNumber.from(payment).lte("0")
  ) {
    throw new Error(`Invalid 'payment': ${payment}. Expected an integer greater than zero as string`);
  }
}

export function validateRequestDataCallbackAddr(callbackAddr: string): void {
  if (
    !ethers.utils.isAddress(callbackAddr) ||
    callbackAddr !== ethers.utils.getAddress(callbackAddr) ||
    callbackAddr === ethers.constants.AddressZero
  ) {
    throw new Error(
      `Invalid 'callbackAddr': ${callbackAddr}. Expected format is a checksum Ethereum address (can't be the Zero address)`,
    );
  }
}

export function validateRequestDataCallbackFunctionName(callbackFunctionName: string): void {
  if (typeof callbackFunctionName !== "string" || !callbackFunctionName.trim()) {
    throw new Error(`Invalid 'callbackFunctionName': ${callbackFunctionName}. Required a non-empty string`);
  }
}

export function validateRequestDataRequestParams(requestParams: ChainlinkRequestParam[]): void {
  if (!Array.isArray(requestParams)) {
    throw new Error(`Invalid 'requestParams': ${requestParams}. Expected format is an Array of RequestParam items`);
  }
  for (const [idx, { name, value, type, valueTypes }] of requestParams.entries()) {
    try {
      if (typeof name !== "string" || !name.trim()) {
        throw new Error(`Invalid 'name': ${JSON.stringify(name)}. Required a non-empty string`);
      }
      if (!new Set(Object.values(RequestParamType)).has(type)) {
        throw new Error(
          `Invalid 'type': ${JSON.stringify(type)}. Supported values are: ${Object.values(RequestParamType).join(
            ", ",
          )}`,
        );
      }
      if (value === null || (typeof value === "object" && !Array.isArray(value))) {
        throw new Error(
          `Invalid 'value': ${JSON.stringify(value)}. Supported JSON types are: boolean, string, number and Array`,
        );
      }
      // NB: type "bytes_encode" requires 'value' and 'valueTypes' as an Array
      if (type === RequestParamType.BYTES) {
        if (!Array.isArray(value)) {
          throw new Error(
            `Invalid 'value': ${JSON.stringify(value)}. Expected format for type '${type}' is an Array of values`,
          );
        }
        if (!Array.isArray(valueTypes)) {
          throw new Error(
            `Invalid 'valueTypes': ${JSON.stringify(
              valueTypes,
            )}. Expected format for type '${type}' is an Array of Solidity data types`,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Invalid 'requestParams' item at position: ${idx}. ${error}. Item: ${JSON.stringify(requestParams[idx])}`,
      );
    }
  }
}

export function validateRequestDataRequestType(requestType: number): void {
  if (!Number.isInteger(requestType) || !new Set(Object.values(RequestType)).has(requestType)) {
    throw new Error(
      `Invalid 'requestType': ${requestType}. Supported values are: ${formatNumericEnumValuesPretty(
        RequestType as unknown as Record<string, number>,
      )}`,
    );
  }
}

export function validateInactive(inactive: boolean): void {
  if (typeof inactive !== "boolean") {
    throw new TypeError(`Invalid 'inactive': ${inactive}. Expected type is boolean`);
  }
}

export function validateLastRequestTimestamp(lastRequestTimestamp: string): void {
  if (
    typeof lastRequestTimestamp !== "string" ||
    !BigNumber.isBigNumber(BigNumber.from(lastRequestTimestamp)) ||
    BigNumber.from(lastRequestTimestamp).lt("0")
  ) {
    throw new Error(
      `Invalid 'lastRequestTimestamp': ${lastRequestTimestamp}. Expected an integer greater or equal than zero as string`,
    );
  }
}

export function validateSchedule(schedule: Schedule): void {
  validateScheduleStartAt(schedule.startAt);
  validateScheduleStartAt(schedule.interval);
}

export function validateScheduleInterval(interval: string): void {
  if (
    typeof interval !== "string" ||
    !BigNumber.isBigNumber(BigNumber.from(interval)) ||
    BigNumber.from(interval).lte("0")
  ) {
    throw new Error(`Invalid 'interval': ${interval}. Expected an integer greater than zero as string`);
  }
}

export function validateScheduleStartAt(startAt: string): void {
  if (
    typeof startAt !== "string" ||
    !BigNumber.isBigNumber(BigNumber.from(startAt)) ||
    BigNumber.from(startAt).lt("0")
  ) {
    throw new Error(`Invalid 'startAt': ${startAt}. Expected a valid epoch timestamp in seconds as string`);
  }
}

export async function withdrawFunds(
  genericConsumer: GenericConsumer,
  signer: ethers.Wallet | SignerWithAddress,
  payee: string,
  amount: BigNumber,
  overrides?: Overrides,
): Promise<void> {
  const logObj = { payee, amount: amount.toString() };
  let tx: ContractTransaction;
  try {
    tx = await genericConsumer.connect(signer).withdrawFunds(payee, amount, overrides);
    logger.info(logObj, `withdrawFunds() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `withdrawFunds() failed due to:`);
    throw error;
  }
}

// Verify a consumer contract whose constructor requires [LINK address]
export async function verifyGenericConsumer(
  hre: HardhatRuntimeEnvironment,
  addressContract: string,
  addressLink: string,
  description: string,
  minGasLimit: BigNumber,
): Promise<void> {
  setChainVerifyApiKeyEnv(hre.network.config.chainId as number, hre.config);
  await hre.run("verify:verify", {
    address: addressContract,
    constructorArguments: [addressLink, description, minGasLimit],
  });
}
