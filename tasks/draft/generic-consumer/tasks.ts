import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ethers } from "ethers";
import { task, types } from "hardhat/config";
import type { NetworkUserConfig, TaskArguments } from "hardhat/types";
import path from "path";

import { BetterSet } from "../../../libs/better-set";
import type { GenericConsumer, LinkToken, ToolsChainlinkTestHelper } from "../../../src/types";
import { convertFunctionNametoSignature } from "../../../utils/abi";
import {
  approve as approveLink,
  convertJobIdToBytes32,
  convertRequestParamsToCborBuffer,
  convertRequestParamsToCborBufferExperimental,
  getNetworkLinkAddressByChainId,
} from "../../../utils/chainlink";
import { validateLinkAddressFunds } from "../../../utils/chainlink";
import { ChainId } from "../../../utils/constants";
import {
  getNetworkLinkAddressDeployingOnHardhat,
  getNumberOfConfirmations,
  getOverrides,
  validateProposedOwnerTaskArgument,
} from "../../../utils/deployment";
import { logger as parentLogger } from "../../../utils/logger";
import { networkUserConfigs } from "../../../utils/networks";
import { getWalletSignerConnected } from "../../../utils/signers";
import {
  address as typeAddress,
  addressesArray as typeAddressesArray,
  bignumber as typeBignumber,
  bytes as typeBytes,
  bytesArray as typeBytesArray,
  network as typeNetwork,
  optionsArray as typeOptionsArray,
  stringArray as typeStringArray,
  uuid as typeUUID,
} from "../../../utils/task-arguments-validations";
import { getFulfillmentTxInputDataDecoded } from "../../chainlink/v0.7/operator/methods";
import { checkPrivateKey } from "../methods";
import {
  MIN_GAS_LIMIT_PERFORM_UPKEEP,
  RequestType,
  TaskExecutionMode,
  TaskRequestAction,
  TaskSetEntryAction,
  TaskSetName,
  TaskSetPauseAction,
  taskSetEntryRequiredInsertArgs,
  taskSetEntryUpdatableArgs,
} from "./constants";
import { callbackFunctionIdToDecoderData } from "./decoders";
import type { DecoderData } from "./decoders/types";
import {
  addEntries,
  addFunds,
  deleteEntries,
  generateEntryKey,
  getEntryConvertedMap,
  getEntryMap,
  getGenericConsumer,
  logGenericConsumerDetail,
  parseAndCheckEntriesFile,
  pause,
  performUpkeep,
  removeEntry,
  removeLot,
  requestData,
  requestDataAndForwardResponse,
  setDescription,
  setEntry,
  setIsUpkeepAllowed,
  setLastRequestTimestamp,
  setLatestRoundId,
  setMinGasLimitPerformUpkeep,
  setupGenericConsumerAfterDeploy,
  setupTaskSet,
  transferOwnership,
  unpause,
  updateEntries,
  validateInactive,
  validateLastRequestTimestamp,
  validateRequestDataCallbackAddr,
  validateRequestDataCallbackFunctionName,
  validateRequestDataExternalJobId,
  validateRequestDataOracleAddr,
  validateRequestDataPayment,
  validateRequestDataRequestParams,
  validateRequestDataRequestType,
  validateScheduleInterval,
  validateScheduleStartAt,
  verifyGenericConsumer,
  withdrawFunds,
} from "./methods";
import type { Entry, EntryConverted, EntryRequested } from "./types";

const logger = parentLogger.child({ name: path.relative(process.cwd(), __filename) });

task("draft:genericconsumer:collect", "Collect and decode fulfilled requests")
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addOptionalParam("from", "from block number", undefined, typeBignumber)
  .addOptionalParam("to", "to block number", undefined, typeBignumber)
  .addOptionalParam("hash", "block hash", undefined, typeBytes(32))
  // Filter topics by
  .addOptionalParam("flrequestids", "filter by an Array of requestId", undefined, typeBytesArray(32))
  .addOptionalParam("flcallbackaddrs", "filter by an Array of callbackAddr", undefined, typeAddressesArray)
  .addOptionalParam("flcallbackfsigs", "filter by an Array of callbackFunctionSignature", undefined, typeBytesArray(4))
  .addOptionalParam("flcallbackfnames", "filter by an Array of callbackFunctionName", undefined, typeStringArray)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // Custom checks
    if (taskArguments.flcallbackfsigs && taskArguments.flcallbackfnames) {
      throw Error(
        `unsupported combination of task arguments: 'flcallbackfsigs', 'flcallbackfnames'. Only pass one of them`,
      );
    }
    const [signer] = await hre.ethers.getSigners();
    logger.info(`connecting to GenericConsumer at: ${taskArguments.address}`);
    const genericConsumer = await getGenericConsumer(hre, taskArguments.address, TaskExecutionMode.PROD, signer);

    // Get topics filters
    const topicsRequestId = taskArguments.flrequestids || null;
    let topicsCallbackAddr = taskArguments.flcallbackaddrs || null;
    if (topicsCallbackAddr) {
      topicsCallbackAddr = topicsCallbackAddr.map((callbackAddr: string) => ethers.utils.hexZeroPad(callbackAddr, 32));
    }
    let topicsCallbackFunctionSignature = null;
    if (taskArguments.flcallbackfsigs) {
      topicsCallbackFunctionSignature = taskArguments.flcallbackfsigs.map((callbackFunctionSignature: string) =>
        callbackFunctionSignature.padEnd(66, "0"),
      );
    }
    if (taskArguments.flcallbackfnames) {
      topicsCallbackFunctionSignature = taskArguments.flcallbackfnames
        .map((callbackFunctionName: string) => convertFunctionNametoSignature(callbackFunctionName))
        .map((callbackFunctionSignature: string) => callbackFunctionSignature.padEnd(66, "0"));
    }
    const filterRequestFulfilled = genericConsumer.filters.ChainlinkFulfilled();
    filterRequestFulfilled.address = genericConsumer.address;
    filterRequestFulfilled.topics = filterRequestFulfilled.topics?.concat([
      topicsRequestId,
      topicsCallbackAddr,
      topicsCallbackFunctionSignature,
    ]);
    // Filter by ChainlinkFulfilled event
    let requestFulfilledEvents;
    if (taskArguments.hash) {
      requestFulfilledEvents = await genericConsumer.queryFilter(filterRequestFulfilled, taskArguments.hash);
    } else {
      requestFulfilledEvents = await genericConsumer.queryFilter(
        filterRequestFulfilled,
        taskArguments.from.toNumber(),
        taskArguments.to ? taskArguments.toNumber() : undefined,
      );
    }
    // Decode each event
    for (const event of requestFulfilledEvents) {
      const { requestId, success, isForwarded, callbackAddr, callbackFunctionSignature, data } = event.args;
      const block = await event.getBlock();
      const tx = await event.getTransaction();
      const oracleDataDecoded = getFulfillmentTxInputDataDecoded(tx.data);
      const txLog = {
        hash: tx.hash,
        block: tx.blockNumber,
        timestamp: block.timestamp
          ? `${block.timestamp} (${new Date(Number(block.timestamp) * 1000).toISOString()})`
          : undefined,
        from: tx.from,
        to: tx.to,
        "data (Oracle PoV)": tx.data,
        "data decoded (Oracle PoV)": oracleDataDecoded,
      };
      let consumerDataDecoded = undefined;

      if (callbackFunctionIdToDecoderData.has(callbackFunctionSignature)) {
        const { callbackFunctionName, decoder } = callbackFunctionIdToDecoderData.get(
          callbackFunctionSignature,
        ) as DecoderData;
        consumerDataDecoded = {
          callbackFunctionName,
          result: undefined,
        };
        try {
          consumerDataDecoded.result = decoder(`0x${data.slice(10)}`); // NB: 0x<callbackFunctionId> is discarded
        } catch (error) {
          logger
            .child({
              tx: txLog,
              requestId,
              success,
              isForwarded,
              callbackAddr,
              callbackFunctionSignature,
              "data (Consumer PoV)": data,
              "data decoded (Consumer PoV)": consumerDataDecoded,
            })
            .error(error, `error decoding event data`);
          // NB: log the error and continue
          // throw error;
        }
      }
      logger.info({
        tx: txLog,
        requestId,
        success,
        isForwarded,
        callbackAddr,
        callbackFunctionSignature,
        "data (Consumer PoV)": data,
        "data decoded (Consumer PoV)": consumerDataDecoded,
      });
    }
    logger.info(`number of ChainlinkFulfilled events found: ${requestFulfilledEvents.length}`);
  });

task("draft:genericconsumer:convert-file-entry", "Convert and log a JSON entry from an entries file into an Entry")
  .addParam("filename", "The entries filename (without .json extension) in the entries folder", undefined, types.string)
  .addParam("jobid", "The entry jobId (TOML spec DB ID)", undefined, types.int)
  .addParam("jobcase", "The entry jobCase", undefined, types.int)
  .addFlag("cbor", "Experimental. Generates the buffer using the CBOR library")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    logger.info(`parsing and checking entries file: ${taskArguments.filename}.json ...`);
    const filePath = `./jobs/draft-entries/${taskArguments.filename}.json`;
    const entries = parseAndCheckEntriesFile(filePath, hre.network.config.chainId as ChainId);

    // Get Entry filtering entries by jobId
    const jobId = taskArguments.jobid;
    const jobCase = taskArguments.jobcase;
    const filteredEntries = (entries as Entry[]).filter(
      entry => entry.description.jobId === jobId && entry.description.jobCase === jobCase,
    );
    if (!filteredEntries.length) {
      throw new Error(`Missing entry by 'jobId' ${jobId} and 'jobCase' ${jobCase}. File: ${taskArguments.filename}`);
    }
    // NB: this should not happen if 'checkEntriesIntegrity()' is run in 'isJobIdUnique' mode (default)
    // and each node has its own JSON entries file
    if (filteredEntries.length > 1) {
      throw new Error(
        `Multiple entries found by 'jobId' ${jobId} and 'jobCase': ${jobCase}. File: ${
          taskArguments.filename
        }. Entries: ${JSON.stringify(filteredEntries)}`,
      );
    }
    const entry = filteredEntries[0];
    logger.info({ entry }, `JSON entry with 'jobId' ${jobId} and 'jobCase' ${jobCase}`);

    // Convert JSON entry properties nad generate Entry key
    const specId = convertJobIdToBytes32(entry.requestData.externalJobId);
    let buffer: string;
    if (taskArguments.cbor) {
      buffer = await convertRequestParamsToCborBufferExperimental(entry.requestData.requestParams);
    } else {
      // Generate buffer from requestparams
      // NB: use Chainlink.sol library on the hardhat network
      const toolsChainlinkTestHelperFactory = await hre.ethers.getContractFactory("ToolsChainlinkTestHelper");
      const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;
      buffer = await convertRequestParamsToCborBuffer(toolsChainlinkTestHelper, entry.requestData.requestParams);
    }
    const oracleAddr = entry.requestData.oracleAddr;
    const payment = BigNumber.from(entry.requestData.payment);
    const callbackAddr = entry.requestData.callbackAddr;
    const callbackFunctionName = entry.requestData.callbackFunctionName;
    const callbackFunctionSignature = convertFunctionNametoSignature(callbackFunctionName);
    const requestType = entry.requestData.requestType;
    const key = generateEntryKey(specId, oracleAddr, buffer);

    logger.info(
      {
        key,
        specId,
        oracleAddr,
        payment: payment.toString(),
        callbackAddr,
        callbackFunctionSignature,
        requestType,
        buffer,
      },
      `Converted JSON entry to Entry`,
    );
    logger.info("*** Convert-file-entry task finished successfully ***");
  });

task("draft:genericconsumer:deploy")
  .addParam("description", "The contract description", undefined, types.string)
  .addParam(
    "mingaslimit",
    "The minimum gas limit allowed to request on performUpkeep()",
    MIN_GAS_LIMIT_PERFORM_UPKEEP,
    typeBignumber,
  )
  // Configuration after deployment
  .addFlag("setup", "Configs the GenericConsumer after deployment")
  .addOptionalParam("owner", "The address to transfer the ownership", undefined, typeAddress)
  // Fund contract after deployment
  .addOptionalParam("funds", "The amount of LINK (wei) to fund the contract on deployment", undefined, typeBignumber)
  // Verification
  .addFlag("verify", "Verify the contract on Etherscan after deployment")
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // Instantiate the signer of the network
    let signer: ethers.Wallet | SignerWithAddress;
    if (hre.network.config.chainId !== ChainId.HARDHAT) {
      checkPrivateKey();
      signer = getWalletSignerConnected(hre.network.name, process.env.PRIVATE_KEY as string);
    } else {
      [signer] = await hre.ethers.getSigners();
    }
    logger.info(`signer address: ${signer.address}`);

    // Get the contract method overrides
    const overrides = await getOverrides(taskArguments, hre);

    // Get LINK address (by network)
    const addressLink = await getNetworkLinkAddressDeployingOnHardhat(hre);

    // Custom validations
    validateProposedOwnerTaskArgument(signer.address, taskArguments.owner);
    const funds = taskArguments.funds as BigNumber;
    if (funds) {
      await validateLinkAddressFunds(hre, signer, signer.address, addressLink, funds);
    }

    // Deploy
    const genericConsumerFactory = await hre.ethers.getContractFactory("GenericConsumer");
    const genericConsumer = (await genericConsumerFactory
      .connect(signer)
      .deploy(addressLink, taskArguments.description, taskArguments.mingaslimit, overrides)) as GenericConsumer;
    logger.info(
      `GenericConsumer deployed to: ${genericConsumer.address} | Tx hash: ${genericConsumer.deployTransaction.hash}`,
    );
    await genericConsumer
      .connect(signer)
      .deployTransaction.wait(getNumberOfConfirmations(hre.network.config.chainId, 5));

    // Setup
    if (taskArguments.setup) {
      await setupGenericConsumerAfterDeploy(taskArguments, genericConsumer, signer, overrides);
    }
    if (!taskArguments.verify) return;

    // Verify
    // NB: contract verification request may fail if the contract address does not have bytecode. Wait until it's mined
    await verifyGenericConsumer(
      hre,
      genericConsumer.address,
      addressLink,
      taskArguments.description,
      taskArguments.mingaslimit,
    );
  });

task("draft:genericconsumer:fund", "Fund a consumer balance with LINK")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addFlag("fundgc", "Funds the contract balance (consumer is GenericConsumer)")
  .addOptionalParam("consumer", "The address that receives LINK in its balance", undefined, typeAddress)
  .addParam("amount", "The LINK amount (wei)", undefined, typeBignumber)
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    if (!taskArguments.fundgc && !taskArguments.consumer) {
      throw new Error(
        `Missing task argument 'consumer'. Required a consumer address unless funding the GenericConsumer balance`,
      );
    }
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.ADD_FUNDS);

    // Get LINK address (by network)
    const networkUserConfig = networkUserConfigs.get(taskArguments.net) as NetworkUserConfig;
    const addressLink = getNetworkLinkAddressByChainId(networkUserConfig.chainId as ChainId, taskArguments.net);

    // Approve LINK
    const linkTokenArtifact = await hre.artifacts.readArtifact("LinkToken");
    const linkToken = new hre.ethers.Contract(addressLink, linkTokenArtifact.abi, netSigner) as LinkToken;
    const amount = taskArguments.amount as BigNumber;
    await approveLink(linkToken, netSigner, genericConsumer.address, amount, overrides);

    // Add funds
    const consumer = taskArguments.fundgc ? genericConsumer.address : taskArguments.consumer;
    await addFunds(genericConsumer, netSigner, consumer, amount, overrides);

    logger.info("*** Fund task finished successfully ***");
  });

task("draft:genericconsumer:import-file", "Add, update and remove contract entries via an entries file")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam("filename", "The entries filename (without .json extension) in the entries folder", undefined, types.string)
  .addParam("lot", "The entries lot", undefined, typeBignumber)
  .addParam("mode", "The execution mode", TaskExecutionMode.DRYRUN, typeOptionsArray(Object.values(TaskExecutionMode)))
  // Batch import
  .addFlag("nobatch", "Disables the batch import")
  .addOptionalParam("batchsize", "Number of entries per CUD transaction", 50, types.int)
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericConsumer, netSigner, overrides, entries } = await setupTaskSet(
      taskArguments,
      hre,
      TaskSetName.IMPORT_FILE,
    );

    // Convert each file entry and map them by key
    // NB: use Chainlink.sol library on the hardhat network
    const toolsChainlinkTestHelperFactory = await hre.ethers.getContractFactory("ToolsChainlinkTestHelper");
    const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;
    logger.info(`converting file entries ...`);
    const entryConvertedMap = await getEntryConvertedMap(entries as Entry[], toolsChainlinkTestHelper);

    // Fetch each GenericConsumer Entry and map them by key
    const lot = taskArguments.lot;
    logger.info(`fetching GenericConsumer lot ${lot} entries ...`);
    const isInsertedLot = await genericConsumer.connect(netSigner).getLotIsInserted(lot);
    const gcKeys = (isInsertedLot ? await genericConsumer.connect(netSigner).getEntryMapKeys(lot) : []) as string[];
    const gcEntryMap = await getEntryMap(genericConsumer, netSigner, lot, gcKeys);

    // Get Entry sets
    logger.info(`calculating GenericConsumer lot ${lot} entries to be removed, updated and added ...`);
    const fileKeys = [...entryConvertedMap.keys()];
    const gcKeysSet = new BetterSet(gcKeys);
    const fileKeysSet = new BetterSet(fileKeys);
    const keysToRemoveSet = gcKeysSet.difference(fileKeysSet);
    const keysToAddSet = fileKeysSet.difference(gcKeysSet);
    const keysToCheckSet = fileKeysSet.intersection(gcKeysSet);

    // Remove, update and add entries
    const isBatchMode = !taskArguments.nobatch;

    await deleteEntries(
      genericConsumer,
      netSigner,
      lot,
      keysToRemoveSet,
      isBatchMode,
      overrides,
      taskArguments.batchsize,
    );
    await updateEntries(
      genericConsumer,
      netSigner,
      lot,
      gcEntryMap,
      entryConvertedMap,
      keysToCheckSet,
      isBatchMode,
      overrides,
      taskArguments.batchsize,
    );
    await addEntries(
      genericConsumer,
      netSigner,
      lot,
      entryConvertedMap,
      keysToAddSet,
      isBatchMode,
      overrides,
      taskArguments.batchsize,
    );
    logger.info("*** Import file task finished successfully ***");
  });

task("draft:genericconsumer:generate-key", "Generate the Entry key")
  .addParam(
    "externaljobid",
    "The Job Specification ID that the request will be created for (as uuid)",
    undefined,
    typeUUID,
  )
  .addParam("oracleaddr", "The oracle contract address", undefined, typeAddress)
  .addParam("requestparams", "The the Chainlink request parameters (as JSON)", undefined, types.json)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    validateRequestDataExternalJobId(taskArguments.externaljobid);
    validateRequestDataOracleAddr(taskArguments.oracleaddr);
    validateRequestDataRequestParams(taskArguments.requestparams);

    // Generate Entry key
    const specId = convertJobIdToBytes32(taskArguments.externaljobid);
    // Convert each jobspec file entry and map them by key
    // NB: use Chainlink.sol library on the hardhat network
    const toolsChainlinkTestHelperFactory = await hre.ethers.getContractFactory("ToolsChainlinkTestHelper");
    const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;

    let buffer: string;
    try {
      buffer = await convertRequestParamsToCborBuffer(toolsChainlinkTestHelper, taskArguments.requestparams);
    } catch (error) {
      logger
        .child({ requestparams: taskArguments.requestparams })
        .error(error, `unexpected error encoding the 'requestParams' to CBOR. Reason:`);
      throw error;
    }
    const key = generateEntryKey(specId, taskArguments.oracleaddr, buffer);
    logger.info(`key: ${key}`);
  });

task("draft:genericconsumer:generate-key-bytes", "Generate the Entry key from bytes args")
  .addParam("specid", "The job spec ID", undefined, typeBytes(32))
  .addParam("oracle", "The oracle address", undefined, typeAddress)
  .addParam("buffer", "The request params CBOR encoded", undefined, typeBytes())
  .setAction(async function (taskArguments: TaskArguments) {
    const key = generateEntryKey(
      taskArguments.specid as string,
      taskArguments.oracle as string,
      taskArguments.buffer as string,
    );
    logger.info(`key: ${key}`);
  });

task("draft:genericconsumer:log", "Query and log the storage")
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  // List each Entry
  .addFlag("keys", "Logs each lot entry key")
  .addFlag("entries", "Logs each lot entry")
  .addFlag("keepers", "Logs each Keeper info per lot")
  .addFlag("lastrequesttimestamps", "Logs each lot entry lastRequestTimestamp")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const [signer] = await hre.ethers.getSigners();
    logger.info(`connecting to GenericConsumer at: ${taskArguments.address}`);
    const genericConsumer = await getGenericConsumer(hre, taskArguments.address, TaskExecutionMode.PROD, signer);

    await logGenericConsumerDetail(
      hre,
      genericConsumer,
      {
        detail: true,
        keys: taskArguments.keys,
        entries: taskArguments.entries,
        keepers: taskArguments.keepers,
        lastRequestTimestamps: taskArguments.lastrequesttimestamps,
      },
      signer,
    );
  });

task("draft:genericconsumer:performupkeep", "Call performupkeep")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam("lot", "The entries lot", undefined, typeBignumber)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addOptionalParam(
    "consumer",
    "The address (e.g. owner, consumer, Keeper) that pays the upkeep from its balance",
    undefined,
    typeAddress,
  )
  // performData (lot is taken from above)
  .addOptionalParam("performdata", "The performData as bytes", undefined, typeBytes())
  .addOptionalParam(
    "performdatadecoded",
    "An array of Entry keys (bytes32[]), excl. 'lot' (uint256)",
    undefined,
    typeBytesArray(32),
  )
  .addFlag("checkupkeep", "Call first checkUpkeep() and pass returned performData to performKeep()")
  // Log tx and events data
  .addFlag("logrequestids", "Logs all the tx requestId")
  .addFlag("logrequestedentries", "Logs all the entries requested (more granular data)")
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // Check task arguments combination
    if (
      Number(!!taskArguments.performdata) +
        Number(!!taskArguments.performdatadecoded) +
        Number(!!taskArguments.checkupkeep) >
      1
    ) {
      throw new Error(
        `Invalid combination of task arguments. Make sure only one of them is passed: 'performdata', 'performdata_decoded', 'checkupkeep'`,
      );
    }
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(
      taskArguments,
      hre,
      TaskSetName.PERFORM_UPKEEP,
    );
    const owner = await genericConsumer.connect(netSigner).owner();
    const isSignerOwner = netSigner.address.toLowerCase() === owner.toLocaleLowerCase();
    logger.warn(`is signer the GenericConsumer owner: ${isSignerOwner}`);

    const lot = taskArguments.lot;
    const isInsertedLot = await genericConsumer.connect(netSigner).getLotIsInserted(lot);
    if (!isInsertedLot) throw new Error(`Lot ${lot} has not been inserted`);

    const isUpkeepAllowed = await genericConsumer.connect(netSigner).getIsUpkeepAllowed(lot);
    if (!isSignerOwner && !isUpkeepAllowed) {
      throw new Error(`Lot ${lot} is not allowed for upkeeps unless signer is the owner`);
    }

    let consumer: string;
    if (taskArguments.consumer) {
      consumer = taskArguments.consumer;
    } else {
      consumer = owner === netSigner.address ? genericConsumer.address : netSigner.address;
    }
    const availableFunds = await genericConsumer.connect(netSigner).availableFunds(consumer);
    if (availableFunds.isZero()) {
      throw new Error(`Upkeep not needed due to no available funds`);
    }

    let performData: string;
    if (taskArguments.checkupkeep) {
      const checkData = hre.ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [lot, consumer]);
      logger.info("calling first checkUpkeep() ...");
      const checkUpkeepResult = await genericConsumer
        .connect(hre.ethers.constants.AddressZero)
        .checkUpkeep(checkData, overrides);
      const [isUpkeepNeeded] = checkUpkeepResult;
      if (!isUpkeepNeeded) {
        throw new Error(`Upkeep is not needed`);
      }
      [, performData] = checkUpkeepResult;
    } else if (taskArguments.performdata) {
      performData = taskArguments.performdata;
    } else if (taskArguments.performdatadecoded) {
      logger.info("encoding 'performdatadecoded' task argument ...");
      try {
        performData = hre.ethers.utils.defaultAbiCoder.encode(
          ["uint256", "bytes32[]"],
          [lot, taskArguments.performdatadecoded],
        );
      } catch (error) {
        logger
          .child({ performdatadecoded: taskArguments.performdatadecoded })
          .error(
            error,
            `unexpected error encoding task argument 'performdatadecoded': ${taskArguments.performdatadecoded}. Reason:`,
          );
        throw error;
      }
    } else {
      throw new Error(`Unsupported combination of task arguments`);
    }
    const receipt = await performUpkeep(genericConsumer, netSigner, performData, overrides);

    // Logs an basic array of requestId
    if (taskArguments.logrequestids) {
      // Basic
      const chainlinkRequestedEvents = receipt.events?.filter(
        event => event.event === "ChainlinkRequested",
      ) as ethers.Event[];
      const requestIds = chainlinkRequestedEvents.map(event => event.topics[1]);
      logger.info({ requestIds }, "requestIds in ChainlinkRequested events");
    }
    // Logs more granular data wrt each request
    if (taskArguments.logrequestedentries) {
      const genericConsumerEntryRequestedEvents = receipt.events?.filter(
        event => event.event === "EntryRequested",
      ) as ethers.Event[];
      const requestIds = genericConsumerEntryRequestedEvents.map(event => event.topics[2]);
      const keys = genericConsumerEntryRequestedEvents.map(event => event.topics[2]);
      // Get entries by lot & key
      const requestedEntries = [];
      for (const [index, key] of keys.entries()) {
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
        ] = await genericConsumer.connect(netSigner).getEntry(lot, key);
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
        const entryRequested: EntryRequested = {
          entry,
          requestId: requestIds[index],
        };
        if (callbackFunctionIdToDecoderData.has(entry.callbackFunctionSignature)) {
          const decoderData = callbackFunctionIdToDecoderData.get(entry.callbackFunctionSignature) as DecoderData;
          entryRequested.callbackFunctionName = decoderData.callbackFunctionName;
        }
        requestedEntries.push(entryRequested);
      }
      logger.info({ requestedEntries }, "requested entries");
    }

    logger.info("*** Perform upkeep task finished successfully ***");
  });

task("draft:genericconsumer:remove-lot", "Remove a lot (incl. all entries) in the storage")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam("lot", "The jobspec entries lot", undefined, typeBignumber)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.REMOVE_LOT);

    const lot = taskArguments.lot;
    const isInsertedLot = await genericConsumer.connect(netSigner).getLotIsInserted(lot);
    if (!isInsertedLot) throw new Error(`Lot ${lot} has not been inserted`);

    logger.info(`fetching GenericConsumer lot ${lot} entries ...`);
    const consumerKeys = await genericConsumer.connect(netSigner).getEntryMapKeys(lot);
    if (!consumerKeys.length) {
      logger.info(`nothing to remove. GenericConsumer ${lot} has no entries`);
      logger.info("*** Remove all task finished successfully ***");
      return;
    }
    logger.info(`${consumerKeys.length} entries in GenericConsumer lot ${lot} ...`);
    await removeLot(genericConsumer, netSigner, lot, overrides);

    logger.info("*** Remove all task finished successfully ***");
  });

task("draft:genericconsumer:remove-entry", "Remove an Entry in the storage")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  // Jobspec entry
  .addParam("lot", "The entries lot", undefined, typeBignumber)
  .addParam("key", "The Entry key", undefined, typeBytes(32))
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.REMOVE_ENTRY);

    const lot = taskArguments.lot;
    const isInsertedLot = await genericConsumer.connect(netSigner).getLotIsInserted(lot);
    if (!isInsertedLot) throw new Error(`Lot ${lot} has not been inserted`);

    logger.info(`fetching GenericConsumer lot ${lot} entries ...`);
    const consumerKeys = await genericConsumer.connect(netSigner).getEntryMapKeys(lot);
    if (!consumerKeys.length) {
      logger.info(`nothing to remove. GenericConsumer has no entries stored in lot ${lot}`);
      logger.info("*** Remove entry task finished successfully ***");
      return;
    }
    logger.info(`${consumerKeys.length} entries in GenericConsumer lot ${lot} ...`);

    if (!new Set(consumerKeys).has(taskArguments.key)) {
      throw new Error(`Missing stored entry with key: ${taskArguments.key}. Nothing to remove`);
    }
    await removeEntry(genericConsumer, netSigner, lot, taskArguments.key, overrides);

    logger.info("*** Remove entry task finished successfully ***");
  });

task("draft:genericconsumer:request", "Build and send a request from task args")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addParam("action", "The action to perform", undefined, typeOptionsArray(Object.values(TaskRequestAction)))
  // Jobspec request data
  .addParam(
    "externaljobid",
    "The Job Specification ID that the request will be created for (as uuid)",
    undefined,
    typeUUID,
  )
  .addParam("oracleaddr", "The oracle contract address", undefined, typeAddress)
  .addParam("payment", "The amount of LINK (wei) paid to the oracle", undefined, typeBignumber)
  .addParam("callbackfunctionname", "The function name to use for the callback", undefined, types.string)
  .addParam("requestparams", "The the Chainlink request parameters (as JSON)", undefined, types.json)
  .addParam("requesttype", "The type of Chainlink request", undefined, typeOptionsArray(Object.values(RequestType)))
  .addOptionalParam("callbackaddr", "The address to operate the callback on", undefined, typeAddress)
  .addFlag("cbor", "Experimental. Generates the buffer using the CBOR library")
  // Log tx and events data
  .addFlag("logrequestid", "Logs all the tx requestId")
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // Validate requestData
    validateRequestDataExternalJobId(taskArguments.externaljobid);
    validateRequestDataOracleAddr(taskArguments.oracleaddr);
    validateRequestDataPayment(taskArguments.payment.toString());
    validateRequestDataCallbackFunctionName(taskArguments.callbackfunctionname);
    validateRequestDataRequestType(Number(taskArguments.requesttype));
    validateRequestDataRequestParams(taskArguments.requestparams);
    if (new Set([TaskRequestAction.REQUEST_DATA_AND_FORWARD]).has(taskArguments.action)) {
      validateRequestDataCallbackAddr(taskArguments.callbackaddr);
    }

    // Generate Entry key
    const specId = convertJobIdToBytes32(taskArguments.externaljobid);

    let buffer: string;
    if (taskArguments.cbor) {
      buffer = await convertRequestParamsToCborBufferExperimental(taskArguments.requestparams);
    } else {
      // Generate buffer from requestparams
      // NB: use Chainlink.sol library on the hardhat network
      const toolsChainlinkTestHelperFactory = await hre.ethers.getContractFactory("ToolsChainlinkTestHelper");
      const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;
      buffer = await convertRequestParamsToCborBuffer(toolsChainlinkTestHelper, taskArguments.requestparams);
    }
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.REQUEST);

    // Check LINK balance
    const payment = taskArguments.payment;
    const owner = await genericConsumer.connect(netSigner).owner();
    const isSignerOwner = netSigner.address === owner;
    const consumer = isSignerOwner ? genericConsumer.address : netSigner.address;
    const balance = await genericConsumer.connect(netSigner).availableFunds(consumer);
    if (balance.lt(payment)) {
      throw new Error(
        `Insufficient LINK balance on ${
          isSignerOwner ? "GenericConsumer" : "signer"
        } (${consumer}): ${balance} (${ethers.utils.formatUnits(balance)} LINK). ` +
          `Required: ${payment} (${ethers.utils.formatUnits(payment)} LINK)`,
      );
    }

    // Request
    let receipt;
    if (taskArguments.action === TaskRequestAction.REQUEST_DATA) {
      receipt = await requestData(
        genericConsumer,
        netSigner,
        specId,
        taskArguments.oracleaddr,
        taskArguments.payment,
        convertFunctionNametoSignature(taskArguments.callbackfunctionname),
        taskArguments.requesttype,
        buffer,
        overrides,
      );
    } else if (taskArguments.action === TaskRequestAction.REQUEST_DATA_AND_FORWARD) {
      receipt = await requestDataAndForwardResponse(
        genericConsumer,
        netSigner,
        specId,
        taskArguments.oracleaddr,
        taskArguments.payment,
        taskArguments.callbackaddr,
        convertFunctionNametoSignature(taskArguments.callbackfunctionname),
        taskArguments.requesttype,
        buffer,
        overrides,
      );
    } else {
      throw new Error(`Unsupported 'action': ${taskArguments.action}`);
    }

    // Log requestId (it helps to collect the fulfilled response)
    if (taskArguments.logrequestid) {
      const chainlinkRequestedEvent = receipt.events?.filter(
        event => event.event === "ChainlinkRequested",
      ) as ethers.Event[];
      const id = chainlinkRequestedEvent[0].topics[1];
      logger.info({ requestId: id }, "requestId in ChainlinkRequested event");
    }

    logger.info("*** Request task finished successfully ***");
  });

task("draft:genericconsumer:request-file-entry", "Build and send a request from an entries file")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam("filename", "The entries filename (without .json extension) in the entries folder", undefined, types.string)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addParam("jobid", "The entry jobId (TOML spec DB ID)", undefined, types.int)
  .addParam("jobcase", "The entry jobCase", undefined, types.int)
  .addFlag("cbor", "Experimental. Generates the buffer using the CBOR library")
  // Log tx and events data
  .addFlag("logrequestid", "Logs all the tx requestId")
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericConsumer, netSigner, overrides, entries } = await setupTaskSet(
      taskArguments,
      hre,
      TaskSetName.REQUEST_FILE_ENTRY,
    );

    // Get Entry filtering entries by jobId
    const jobId = taskArguments.jobid;
    const jobCase = taskArguments.jobcase;
    const filteredEntries = (entries as Entry[]).filter(
      entry => entry.description.jobId === jobId && entry.description.jobCase === jobCase,
    );
    if (!filteredEntries.length) {
      throw new Error(`Missing entry by 'jobId' ${jobId} and 'jobCase' ${jobCase}. File: ${taskArguments.filename}`);
    }
    // NB: this should not happen if 'checkEntriesIntegrity()' is run in 'isJobIdUnique' mode (default)
    // and each node has its own JSON entries file
    if (filteredEntries.length > 1) {
      throw new Error(
        `Multiple entries found by 'jobId' ${jobId} and 'jobCase': ${jobCase}. File: ${
          taskArguments.filename
        }. Entries: ${JSON.stringify(filteredEntries)}`,
      );
    }
    const entry = filteredEntries[0];

    // Convert JSON entry properties
    const specId = convertJobIdToBytes32(entry.requestData.externalJobId);
    let buffer: string;
    if (taskArguments.cbor) {
      buffer = await convertRequestParamsToCborBufferExperimental(entry.requestData.requestParams);
    } else {
      // Generate buffer from requestparams
      // NB: use Chainlink.sol library on the hardhat network
      const toolsChainlinkTestHelperFactory = await hre.ethers.getContractFactory("ToolsChainlinkTestHelper");
      const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;
      buffer = await convertRequestParamsToCborBuffer(toolsChainlinkTestHelper, entry.requestData.requestParams);
    }
    const oracleAddr = entry.requestData.oracleAddr;
    const payment = BigNumber.from(entry.requestData.payment);
    const callbackAddr = entry.requestData.callbackAddr;
    const callbackFunctionName = entry.requestData.callbackFunctionName;
    const callbackFunctionSignature = convertFunctionNametoSignature(callbackFunctionName);
    const requestType = entry.requestData.requestType;

    // Check LINK balance
    const owner = await genericConsumer.connect(netSigner).owner();
    const isSignerOwner = netSigner.address === owner;
    const consumer = isSignerOwner ? genericConsumer.address : netSigner.address;
    const balance = await genericConsumer.connect(netSigner).availableFunds(consumer);
    if (balance.lt(payment)) {
      throw new Error(
        `Insufficient LINK balance on ${
          isSignerOwner ? "GenericConsumer" : "signer"
        } (${consumer}): ${balance} (${ethers.utils.formatUnits(balance)} LINK). ` +
          `Required: ${payment} (${ethers.utils.formatUnits(payment)} LINK)`,
      );
    }

    // Call requestData or requestDataAndForwardResponse depending on callbackAddr
    let receipt;
    if (callbackAddr === genericConsumer.address) {
      receipt = await requestData(
        genericConsumer,
        netSigner,
        specId,
        oracleAddr,
        payment,
        callbackFunctionSignature,
        requestType,
        buffer,
        overrides,
      );
    } else {
      receipt = await requestDataAndForwardResponse(
        genericConsumer,
        netSigner,
        specId,
        oracleAddr,
        payment,
        callbackAddr,
        callbackFunctionSignature,
        requestType,
        buffer,
        overrides,
      );
    }

    // Log requestId (it helps to collect the fulfilled response)
    if (taskArguments.logrequestid) {
      const chainlinkRequestedEvent = receipt.events?.filter(
        event => event.event === "ChainlinkRequested",
      ) as ethers.Event[];
      const id = chainlinkRequestedEvent[0].topics[1];
      logger.info({ requestId: id }, "requestId in ChainlinkRequested event");
    }

    logger.info("*** Request-file-entry task finished successfully ***");
  });

task("draft:genericconsumer:set-pause", "Pause or unpause the GenericConsumer")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addParam("action", "The action to perform", undefined, typeOptionsArray(Object.values(TaskSetPauseAction)))
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.SET_PAUSE);

    const paused = await genericConsumer.connect(netSigner).paused();
    if (
      (taskArguments.action === TaskSetPauseAction.PAUSE && paused) ||
      (taskArguments.action === TaskSetPauseAction.UNPAUSE && !paused)
    ) {
      logger.warn(`can't ${taskArguments.action}. GenericConsumer already is`);
      return;
    }

    // Set pause
    switch (taskArguments.action) {
      case TaskSetPauseAction.PAUSE:
        await pause(genericConsumer, netSigner, overrides);
        break;
      case TaskSetPauseAction.UNPAUSE:
        await unpause(genericConsumer, netSigner, overrides);
        break;
      default:
        throw new Error(`Unsupported 'action': ${taskArguments.action}`);
    }
    logger.info("*** Pause task finished successfully ***");
  });

task("draft:genericconsumer:set-entry", "Set an Entry in the storage")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addParam("action", "The action to perform", undefined, typeOptionsArray(Object.values(TaskSetEntryAction)))
  .addParam("lot", "The entries lot", undefined, typeBignumber)
  // Entry - key
  .addParam(
    "externaljobid",
    "The Job Specification ID that the request will be created for (as UUIDv4)",
    undefined,
    typeUUID,
  )
  .addParam("oracleaddr", "The oracle contract address", undefined, typeAddress)
  .addParam("requestparams", "The the Chainlink request parameters (as JSON)", undefined, types.json)
  .addParam("requesttype", "The type of Chainlink request", undefined, typeOptionsArray(Object.values(RequestType)))
  // Entry - inactive
  .addOptionalParam("inactive", "Whether the spec entry is requestable", undefined, types.boolean)
  // Entry - lastRequestTimestamp
  .addOptionalParam(
    "lastrequesttimestamp",
    "A point in time of the last request (UNIX Epoch in seconds as string)",
    undefined,
    typeBignumber,
  )
  // Entry - requestData
  .addOptionalParam("payment", "The amount of LINK (wei) paid to the oracle", undefined, typeBignumber)
  .addOptionalParam("callbackaddr", "The address to operate the callback on", undefined, typeAddress)
  .addOptionalParam("callbackfunctionname", "The function name to use for the callback", undefined, types.string)
  // Entry - schedule
  .addOptionalParam(
    "startat",
    "A point in time after which the jobspec entry is requestable (UNIX Epoch in seconds as string)",
    undefined,
    typeBignumber,
  )
  .addOptionalParam(
    "interval",
    "The minimum amount of time between requests (UNIX Epoch in seconds as string)",
    undefined,
    typeBignumber,
  )
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // Check require params
    validateRequestDataExternalJobId(taskArguments.externaljobid);
    validateRequestDataOracleAddr(taskArguments.oracleaddr);
    validateRequestDataRequestParams(taskArguments.requestparams);

    // Check optional params
    if (taskArguments.payment !== undefined) {
      validateRequestDataPayment(taskArguments.payment.toString());
    }
    if (taskArguments.callbackaddr !== undefined) {
      validateRequestDataCallbackAddr(taskArguments.callbackaddr);
    }
    if (taskArguments.callbackfunctionname !== undefined) {
      validateRequestDataCallbackFunctionName(taskArguments.callbackfunctionname);
    }
    if (taskArguments.requesttype !== undefined) {
      validateRequestDataRequestType(taskArguments.requesttype);
    }
    if (taskArguments.interval !== undefined) {
      validateScheduleInterval(taskArguments.interval.toString());
    }
    if (taskArguments.startat !== undefined) {
      validateScheduleStartAt(taskArguments.startat.toString());
    }
    if (taskArguments.inactive !== undefined) {
      validateInactive(taskArguments.inactive);
    }
    if (taskArguments.lastrequesttimestamp !== undefined) {
      validateLastRequestTimestamp(taskArguments.lastrequesttimestamp);
    }

    // Check params per action
    if (taskArguments.action === TaskSetEntryAction.INSERT) {
      taskSetEntryRequiredInsertArgs.forEach(requiredArg => {
        if (taskArguments[requiredArg] === undefined) {
          throw new Error(`Missing task argument '${requiredArg}'. It is required for inserting an Entry`);
        }
      });
    }

    let hasUpdatableEntryArgs = false;
    if (taskArguments.action === TaskSetEntryAction.UPDATE) {
      let hasUpdatableArgs = false;

      for (const requiredArg of taskSetEntryUpdatableArgs) {
        if (taskArguments[requiredArg] !== undefined) {
          hasUpdatableArgs = true;
          hasUpdatableEntryArgs = true;
          break;
        }
      }
      if (taskArguments.lastrequesttimestamp !== undefined) {
        hasUpdatableArgs = true;
      }
      if (!hasUpdatableArgs) {
        throw new Error(
          `At least a single task argument is required for updating an Entry or its lastRequestTimestamp`,
        );
      }
    }
    // Generates the Entry key
    const specId = convertJobIdToBytes32(taskArguments.externaljobid);
    // Convert each jobspec file entry and map them by key
    // NB: use Chainlink.sol library on the hardhat network
    const toolsChainlinkTestHelperFactory = await hre.ethers.getContractFactory("ToolsChainlinkTestHelper");
    const toolsChainlinkTestHelper = (await toolsChainlinkTestHelperFactory.deploy()) as ToolsChainlinkTestHelper;

    let buffer: string;
    try {
      buffer = await convertRequestParamsToCborBuffer(toolsChainlinkTestHelper, taskArguments.requestparams);
    } catch (error) {
      logger
        .child({ requestparams: taskArguments.requestparams })
        .error(error, `unexpected error encoding the 'requestParams' to CBOR. Reason:`);
      throw error;
    }
    const key = generateEntryKey(specId, taskArguments.oracleaddr, buffer);

    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.SET_ENTRY);
    const lot = taskArguments.lot;

    // Check Entry exists
    const isInserted = await genericConsumer.connect(netSigner).getEntryIsInserted(lot, key);

    // Perform insert or update
    if (taskArguments.action === TaskSetEntryAction.INSERT) {
      // Insert Entry
      const entry: EntryConverted = {
        key,
        specId: specId,
        oracle: taskArguments.oracleaddr,
        payment: taskArguments.payment,
        callbackAddr: taskArguments.callbackaddr,
        callbackFunctionSignature: convertFunctionNametoSignature(taskArguments.callbackfunctionname),
        requestType: taskArguments.requesttype,
        buffer,
        startAt: taskArguments.startat,
        interval: taskArguments.interval,
        inactive: taskArguments.inactive,
      };
      await setEntry(genericConsumer, netSigner, lot, key, entry, overrides, "Added");
    } else if (taskArguments.action === TaskSetEntryAction.UPDATE) {
      if (!isInserted) throw new Error(`Not found in lot ${lot} Entry with key: ${key}. It can't be updated`);
      // Update Entry lastRequestTimestamp
      if (taskArguments.lastrequesttimestamp !== undefined) {
        await setLastRequestTimestamp(
          genericConsumer,
          netSigner,
          lot,
          key,
          taskArguments.lastrequesttimestamp,
          overrides,
        );
      }
      // Update Entry
      if (hasUpdatableEntryArgs) {
        const [
          cSpecId,
          cOracle,
          cPayment,
          cCallbackAddr,
          cStartAt,
          cInterval,
          cCallbackFunctionSignature,
          cInactive,
          cRequestType,
          cBuffer,
        ] = await genericConsumer.connect(netSigner).getEntry(lot, key);
        const consumerEntry: EntryConverted = {
          key,
          specId: cSpecId,
          oracle: cOracle,
          payment: cPayment,
          callbackAddr: cCallbackAddr,
          callbackFunctionSignature: cCallbackFunctionSignature,
          requestType: cRequestType,
          buffer: cBuffer,
          startAt: cStartAt,
          interval: cInterval,
          inactive: cInactive,
        };
        if (taskArguments.callbackaddr !== undefined) {
          consumerEntry.callbackAddr = taskArguments.callbackaddr;
        }
        if (taskArguments.callbackfunctionname !== undefined) {
          consumerEntry.callbackFunctionSignature = convertFunctionNametoSignature(taskArguments.callbackfunctionname);
        }
        if (taskArguments.inactive !== undefined) {
          consumerEntry.inactive = taskArguments.inactive;
        }
        if (taskArguments.interval !== undefined) {
          consumerEntry.interval = taskArguments.interval;
        }
        if (taskArguments.payment !== undefined) {
          consumerEntry.payment = taskArguments.payment;
        }
        if (taskArguments.requestType !== undefined) {
          consumerEntry.requestType = taskArguments.requestType;
        }
        if (taskArguments.startAt !== undefined) {
          consumerEntry.startAt = taskArguments.startat;
        }
        await setEntry(genericConsumer, netSigner, lot, key, consumerEntry, overrides, "Updated");
      }
    } else {
      throw new Error(`Unsupported 'action': ${taskArguments.action}`);
    }
    logger.info("*** Set entry task finished successfully ***");
  });

task("draft:genericconsumer:set-stuff", "Set all kind of variables in the storage")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addOptionalParam("description", "The new 'description' value", undefined, types.string)
  .addOptionalParam("latestroundid", "The new 'latestRoundId' value", undefined, typeBignumber)
  .addOptionalParam("owner", "The address to transfer the ownership", undefined, typeAddress)
  .addOptionalParam("lot", "The entries lot", undefined, typeBignumber)
  .addOptionalParam(
    "mingaslimit",
    "The minimum gas limit allowed to request on performUpkeep()",
    undefined,
    typeBignumber,
  )
  .addOptionalParam("isupkeepallowed", "Whether Keepers upkeep is allowed on the lot", undefined, types.boolean)
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericConsumer, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.SET_STUFF);

    // Set description
    if (taskArguments.description) {
      await setDescription(genericConsumer, netSigner, taskArguments.description, overrides);
    }

    // Set latestRoundId
    if (taskArguments.latestroundid) {
      await setLatestRoundId(genericConsumer, netSigner, taskArguments.latestroundid, overrides);
    }

    // Transfer ownerwhip
    if (taskArguments.owner) {
      await transferOwnership(genericConsumer, netSigner, taskArguments.owner, overrides);
    }

    // Set minGasLimitPerformUpkeep
    if (taskArguments.mingaslimit) {
      await setMinGasLimitPerformUpkeep(genericConsumer, netSigner, taskArguments.mingaslimit, overrides);
    }

    // Set lot isUpkeepAllowed
    if (taskArguments.lot && taskArguments.isupkeepallowed !== undefined) {
      await setIsUpkeepAllowed(genericConsumer, netSigner, taskArguments.lot, taskArguments.isupkeepallowed, overrides);
    }
    logger.info("*** Set stuff task finished successfully ***");
  });

task("draft:genericconsumer:verify")
  .addParam("address", "The deployed contract address", undefined, typeAddress)
  .addParam("description", "The contract description", undefined, types.string)
  .addParam(
    "mingaslimit",
    "The minimum gas limit allowed to request on performUpkeep()",
    MIN_GAS_LIMIT_PERFORM_UPKEEP,
    typeBignumber,
  )
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const addressLink = await getNetworkLinkAddressDeployingOnHardhat(hre);
    await verifyGenericConsumer(
      hre,
      taskArguments.address,
      addressLink,
      taskArguments.description,
      taskArguments.mingaslimit,
    );
  });

task("draft:genericconsumer:withdraw", "Withdraw LINK from the consumer balance")
  .addParam("net", "The network name", undefined, typeNetwork)
  .addParam("address", "The GenericConsumer contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  // More granular withdraw
  .addFlag("granular", "Allows setting a payee and an amount")
  .addOptionalParam("payee", "The address that receives the LINK", undefined, typeAddress)
  .addOptionalParam("amount", "The LINK amount", undefined, typeBignumber)
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    // Check task arguments combination
    if (taskArguments.granular && (!taskArguments.payee || !taskArguments.amount)) {
      throw new Error(`A granular withdraw requires 'payee' and 'amount' task arguments`);
    }

    const { genericConsumer, netSigner, overrides } = await setupTaskSet(
      taskArguments,
      hre,
      TaskSetName.WITHDRAW_FUNDS,
    );

    if (taskArguments.granular) {
      await withdrawFunds(genericConsumer, netSigner, taskArguments.payee, taskArguments.amount, overrides);
    } else {
      const availableFunds = await genericConsumer.connect(netSigner).availableFunds(netSigner.address);
      await withdrawFunds(genericConsumer, netSigner, taskArguments.payee, availableFunds, overrides);
    }

    logger.info("*** Withdraw task finished successfully ***");
  });
