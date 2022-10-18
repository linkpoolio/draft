import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import path from "path";

import type { Operator } from "../../../../src/types";
import { convertFunctionNametoSignature } from "../../../../utils/abi";
import {
  getNetworkLinkAddressDeployingOnHardhat,
  getNumberOfConfirmations,
  getOverrides,
  validateProposedOwnerTaskArgument,
} from "../../../../utils/deployment";
import { logger as parentLogger } from "../../../../utils/logger";
import {
  address as typeAddress,
  addressesArray as typeAddressesArray,
  bignumber as typeBignumber,
  bytes as typeBytes,
  bytesArray as typeBytesArray,
  stringArray as typeStringArray,
} from "../../../../utils/task-arguments-validations";
import { callbackFunctionIdToDecoderData } from "../../../draft/generic-consumer/decoders";
import type { DecoderData } from "../../../draft/generic-consumer/decoders/types";
import { getFulfillmentTxInputDataDecoded, setupOperatorAfterDeploy, verifyOperator } from "./methods";

const logger = parentLogger.child({ name: path.relative(process.cwd(), __filename) });

task("operator:v0.7:collect", "Collect and decode fulfilled requests on an oracle contract")
  .addParam("address", "The Operator contract address", undefined, typeAddress)
  .addOptionalParam("from", "from block number", undefined, typeBignumber)
  .addOptionalParam("to", "to block number", undefined, typeBignumber)
  .addOptionalParam("hash", "block hash", undefined, typeBytes(32))
  .addOptionalParam("decodersigs", "Array of decoder signatures", undefined, typeBytesArray(4))
  .addOptionalParam("decodernames", "Array of decoder names", undefined, typeStringArray)
  // Filter topics by
  .addOptionalParam("flrequestids", "filter by an Array of requestId", undefined, typeBytesArray(32))
  .setAction(async function (taskArguments: TaskArguments, hre) {
    logger.info(`connecting to Operator/Oracle at: ${taskArguments.address}`);

    // Get GenericConsumer contract at address
    const operatorArtifact = await hre.artifacts.readArtifact("Operator");
    const operator = (await hre.ethers.getContractAt(operatorArtifact.abi, taskArguments.address)) as Operator;

    // Custom checks
    if (taskArguments.decodersigs && taskArguments.decodernames) {
      throw Error(`unsupported combination of task arguments: 'decodersigs', 'decodernames'. Only pass one of them`);
    }
    // Get decoders
    let callbackFunctionSignatures: string[] = [];
    if (taskArguments.decodernames) {
      callbackFunctionSignatures = taskArguments.decodernames.map((callbackFunctionName: string) => {
        const callbackFunctionSignature = convertFunctionNametoSignature(callbackFunctionName);
        if (!callbackFunctionIdToDecoderData.has(callbackFunctionSignature)) {
          throw new Error(`Unable to find decoder by name: ${callbackFunctionName}`);
        }
        return callbackFunctionSignature;
      });
    } else {
      callbackFunctionSignatures = taskArguments.decodersigs.map((callbackFunctionSignature: string) => {
        if (!callbackFunctionIdToDecoderData.has(callbackFunctionSignature)) {
          throw new Error(`Unable to find decoder by signature: ${callbackFunctionSignature}`);
        }
        return callbackFunctionSignature;
      });
    }
    // Get topics filters
    const topicsRequestId = taskArguments.flrequestids || null;
    const filterOracleResponse = operator.filters.OracleResponse();
    filterOracleResponse.address = operator.address;
    filterOracleResponse.topics = filterOracleResponse.topics?.concat([topicsRequestId]);
    // Filter by  event
    let requestFulfilledEvents;
    if (taskArguments.hash) {
      requestFulfilledEvents = await operator.queryFilter(filterOracleResponse, taskArguments.hash);
    } else {
      requestFulfilledEvents = await operator.queryFilter(
        filterOracleResponse,
        taskArguments.from.toNumber(),
        taskArguments.to ? taskArguments.toNumber() : undefined,
      );
    }
    // Decode each event
    for (const event of requestFulfilledEvents) {
      const { requestId } = event.args;
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
      const consumerData = `0x${tx.data.slice(458)}`;

      let consumerDataDecoded = undefined;
      for (const [idx, callbackFunctionSignature] of Object.entries(callbackFunctionSignatures)) {
        const { callbackFunctionName, decoder } = callbackFunctionIdToDecoderData.get(
          callbackFunctionSignature,
        ) as DecoderData;
        consumerDataDecoded = {
          callbackFunctionName,
          result: undefined,
        };
        try {
          consumerDataDecoded.result = decoder(consumerData);
          logger.info({
            tx: txLog,
            requestId,
            callbackFunctionSignature,
            "data (Consumer PoV)": consumerData,
            "data decoded (Consumer PoV)": consumerDataDecoded,
          });
          break;
        } catch (error) {
          logger.warn(
            { idx, callbackFunctionName, callbackFunctionSignature },
            "Unable to decode data with this decoder. Skipping ...",
          );
        }
      }
      if (!consumerData) {
        logger.warn({ tx: txLog, requestId, "data (Consumer PoV)": consumerData }, "Unable to decode the data");
      }
    }
    logger.info(`number of OracleResponse events found: ${requestFulfilledEvents.length}`);
  });

task("operator:v0.7:deploy", "Deploy, set-up and verify an Operator.sol")
  // Configuration after deployment
  .addFlag("setup", "Configs the Operator after deployment")
  .addOptionalParam("owner", "The address to transfer the ownership", undefined, typeAddress)
  .addOptionalParam("senders", "The authorized senders' addresses", undefined, typeAddressesArray)
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
    const [signer] = await hre.ethers.getSigners();
    logger.info(`signer address: ${signer.address}`);

    // Get the contract method overrides
    const overrides = await getOverrides(taskArguments, hre);

    // Deploy
    validateProposedOwnerTaskArgument(signer.address, taskArguments.owner);
    const addressLink = await getNetworkLinkAddressDeployingOnHardhat(hre);
    const operatorFactory = await hre.ethers.getContractFactory("Operator");
    const operator = (await operatorFactory.deploy(addressLink, signer.address, overrides)) as Operator;
    logger.info(`Operator deployed to: ${operator.address} | Tx hash: ${operator.deployTransaction.hash}`);
    await operator.deployTransaction.wait(getNumberOfConfirmations(hre.network.config.chainId));

    // Setup
    if (taskArguments.setup) {
      await setupOperatorAfterDeploy(taskArguments, operator, overrides);
    }

    // Verify
    if (!taskArguments.verify) return;
    await verifyOperator(hre, operator.address, addressLink, signer.address);
  });

task("operator:v0.7:verify")
  .addParam("address", "The deployed contract address", undefined, typeAddress)
  .addOptionalParam("deployer", "The deployer address (the owner at creation time)", undefined, typeAddress)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const addressLink = await getNetworkLinkAddressDeployingOnHardhat(hre);
    const addressOwner = taskArguments.deployer ?? (await hre.ethers.getSigners())[0];
    await verifyOperator(hre, taskArguments.address, addressLink, addressOwner);
  });
