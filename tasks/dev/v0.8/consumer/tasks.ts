import LinkTokenInterface from "@chainlink/contracts/abi/v0.8/LinkTokenInterface.json";
import type { ContractTransaction } from "@ethersproject/contracts";
import { BigNumber } from "ethers";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import path from "path";

import type { LinkToken } from "../../../../src/types";
import { validateLinkAddressFunds } from "../../../../utils/chainlink";
import {
  getNumberOfConfirmations,
  getOverrides,
  getStandardConsumerConstructorArguments,
  validateProposedOwnerTaskArgument,
} from "../../../../utils/deployment";
import { logger as parentLogger } from "../../../../utils/logger";
import { address as typeAddress, bignumber as typeBignumber } from "../../../../utils/task-arguments-validations";
import { verifyStandardConsumer } from "./methods";

const logger = parentLogger.child({ name: path.relative(process.cwd(), __filename) });

task("consumer:v0.8:deploy")
  .addParam("name", "The consumer contract name", undefined, types.string)
  // Configuration after deployment
  .addOptionalParam("operator", "The Operator contract address", undefined, typeAddress)
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
    const [signer] = await hre.ethers.getSigners();
    logger.info(`signer address: ${signer.address}`);

    // Get the contract method overrides
    const overrides = await getOverrides(taskArguments, hre);

    // Get Operator address, and LINK address (by network)
    const { addressOperator, addressLink } = await getStandardConsumerConstructorArguments(taskArguments, hre);

    // Custom validations
    validateProposedOwnerTaskArgument(signer.address, taskArguments.owner);
    const funds = taskArguments.funds as BigNumber;
    if (funds) {
      await validateLinkAddressFunds(hre, signer, signer.address, addressLink, funds);
    }

    // Deploy
    const consumerFactory = await hre.ethers.getContractFactory(taskArguments.name);
    const consumer = await consumerFactory.deploy(addressLink, addressOperator, overrides);
    logger.info(`${taskArguments.name} deployed to: ${consumer.address} | Tx hash: ${consumer.deployTransaction.hash}`);
    await consumer.deployTransaction.wait(getNumberOfConfirmations(hre.network.config.chainId));

    // Fund Consumer with LINK
    if (funds) {
      const contractLINK = (await hre.ethers.getContractAt(LinkTokenInterface, addressLink)) as LinkToken;
      const logObjTransfer = {
        to: consumer.address,
        value: funds.toString(),
      };
      let tx: ContractTransaction;
      try {
        tx = await contractLINK.transfer(consumer.address, funds, overrides);
        logger.info(logObjTransfer, `transfer() LINK | Tx hash: ${tx.hash}`);
        await tx.wait();
      } catch (error) {
        logger.child(logObjTransfer).error(error, `transfer() failed due to: ${error}`);
        throw error;
      }
    }
    if (!taskArguments.verify) return;

    // Verify
    // NB: contract verification request may fail if the contract address does not have bytecode. Wait until it's mined
    await verifyStandardConsumer(hre, consumer.address, addressLink, addressOperator);
  });

task("consumer:v0.8:verify", "Verify a consumer contract whose constructor requires [<address LINK>,<address oracle>]")
  .addParam("address", "The deployed contract address", undefined, typeAddress)
  .addOptionalParam("operator", "The oracle contract address", undefined, typeAddress)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { addressOperator, addressLink } = await getStandardConsumerConstructorArguments(taskArguments, hre);
    await verifyStandardConsumer(hre, taskArguments.address, addressLink, addressOperator);
  });
