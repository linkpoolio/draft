import type { ContractTransaction } from "@ethersproject/contracts";
import { BigNumber, ethers } from "ethers";
import type { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import path from "path";

import type { Operator } from "../../../../src/types";
import { logger as parentLogger } from "../../../../utils/logger";
import type { Overrides } from "../../../../utils/types";
import { setChainVerifyApiKeyEnv } from "../../../../utils/verification";
import { OperatorFunctionId, operatorFunctionIdToFunctionSignature } from "./constants";
import type { OperatorFulfillmentTxInputDataDecoded } from "./types";

const logger = parentLogger.child({ name: path.relative(process.cwd(), __filename) });

export function getFulfillmentTxCallbackFunctionName(callbackFunctionId: OperatorFunctionId): string {
  switch (callbackFunctionId) {
    case OperatorFunctionId.FULFILL_ORACLE_REQUEST:
    case OperatorFunctionId.FULFILL_ORACLE_REQUEST_2:
      break;
    default:
      throw new Error(`Unsupported 'callbackFunctionId': ${callbackFunctionId}`);
  }
  return operatorFunctionIdToFunctionSignature.get(callbackFunctionId) as string;
}

export function getFulfillmentTxInputDataDecoded(txData: string): OperatorFulfillmentTxInputDataDecoded {
  const callbackFunctionSignature = `0x${txData.slice(2, 10)}` as OperatorFunctionId;
  const requestId = `0x${txData.slice(10, 74)}`;
  const payment = `0x${txData.slice(74, 138)}`;
  const callbackAddress = `0x${txData.slice(138, 202)}`;
  const callbackAddressNotPadded = `0x${txData.slice(162, 202)}`;
  const functionId = `0x${txData.slice(202, 266)}`;
  const functionIdNotPadded = `0x${txData.slice(202, 212)}`;
  const expiration = `0x${txData.slice(266, 330)}`;
  const data = `0x${txData.slice(330)}`;
  return {
    callbackFunctionSignature: `${callbackFunctionSignature} (${getFulfillmentTxCallbackFunctionName(
      callbackFunctionSignature,
    )})`,
    requestId,
    payment: `${payment}} (${ethers.utils.formatUnits(BigNumber.from(payment).toString())} LINK)`,
    callbackAddress: `${callbackAddress} (${callbackAddressNotPadded})`,
    functionId: `${functionId} (${functionIdNotPadded})`,
    expiration: `${expiration} (${BigNumber.from(expiration).toString()} - ${new Date(
      Number(expiration) * 1000,
    ).toISOString()})`,
    data,
  };
}

export async function setupOperatorAfterDeploy(taskArguments: TaskArguments, operator: Operator, overrides: Overrides) {
  // Set authorized senders
  const senders = taskArguments.senders as string[];
  let tx: ContractTransaction;
  try {
    tx = await operator.setAuthorizedSenders(senders, overrides);
    logger.info(senders, `setAuthorizedSenders() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(senders).error(error, `setAuthorizedSenders() failed due to:`);
    throw error;
  }

  // Transfer ownership
  const owner = taskArguments.owner;
  if (owner) {
    try {
      tx = await operator.transferOwnership(taskArguments.owner as string, overrides);
      logger.info({ owner }, `transferOwnership() | Tx hash: ${tx.hash}`);
      await tx.wait();
    } catch (error) {
      logger.child({ owner }).error(error, `transferOwnership() failed due to:`);
      throw error;
    }
  }
}

export async function verifyOperator(
  hre: HardhatRuntimeEnvironment,
  addressContract: string,
  addressLink: string,
  addressOwner: string,
  contract?: string,
): Promise<void> {
  setChainVerifyApiKeyEnv(hre.network.config.chainId as number, hre.config);
  await hre.run("verify:verify", {
    address: addressContract,
    constructorArguments: [addressLink, addressOwner],
    contract,
  });
}
