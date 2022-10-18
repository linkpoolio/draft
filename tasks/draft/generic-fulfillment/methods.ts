import type { ContractTransaction } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import type { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import path from "path";

import type { GenericFulfillment, GenericFulfillmentUUPS } from "../../../src/types";
import { getOverrides, isAddressAContract } from "../../../utils/deployment";
import { impersonateAccount } from "../../../utils/hre";
import { logger as parentLogger } from "../../../utils/logger";
import { getWalletSignerConnected } from "../../../utils/signers";
import type { Overrides } from "../../../utils/types";
import { setChainVerifyApiKeyEnv } from "../../../utils/verification";
import { checkPrivateKey } from "../methods";
import { AccessControlRole, TaskExecutionMode, TaskSetName, TaskSetRolesAction } from "./constants";
import type { TaskSetData } from "./types";

const logger = parentLogger.child({ name: path.relative(process.cwd(), __filename) });

export async function checkAddressRole(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  address: string,
  role: AccessControlRole,
): Promise<void> {
  let roleAsBytes32;
  switch (role) {
    case AccessControlRole.CONSUMER_ROLE:
      roleAsBytes32 = await genericFulfillment.connect(signer).CONSUMER_ROLE();
      break;
    case AccessControlRole.DEFAULT_ADMIN_ROLE:
      roleAsBytes32 = await genericFulfillment.connect(signer).DEFAULT_ADMIN_ROLE();
      break;
    default:
      throw new Error(`Unsupported 'role': ${role}`);
  }
  const hasDefaultAdminRole = await genericFulfillment.connect(signer).hasRole(roleAsBytes32, address);
  if (!hasDefaultAdminRole) {
    throw new Error(`Invalid role for address: ${address}. Task requires role: ${role.toUpperCase()}`);
  }
}

export async function deployGenericFulfillmentOnHardhat(
  hre: HardhatRuntimeEnvironment,
  signer: ethers.Wallet | SignerWithAddress,
  overrides?: Overrides,
): Promise<GenericFulfillment> {
  // Deploy GenericFulfillment
  const genericFulfillmentFactory = await hre.ethers.getContractFactory("GenericFulfillment");
  const genericFulfillment = (await genericFulfillmentFactory.connect(signer).deploy()) as GenericFulfillment;
  await genericFulfillment.deployTransaction.wait();

  // Setup GenericFulfillment
  await setDescription(genericFulfillment, signer, "GenericFulfillment for dry run mode on Hardhat", overrides);

  return genericFulfillment;
}

export async function getGenericFulfillment(
  hre: HardhatRuntimeEnvironment,
  fulfillment: string,
  mode: TaskExecutionMode,
): Promise<GenericFulfillment> {
  if (!new Set([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]).has(mode)) {
    throw new Error(`Unsupported 'mode': ${mode}`);
  }

  // Get GenericFulfillment contract at address
  const genericFulfillmentArtifact = await hre.artifacts.readArtifact("GenericFulfillment");
  const genericFulfillment = (await hre.ethers.getContractAt(
    genericFulfillmentArtifact.abi,
    fulfillment,
  )) as GenericFulfillment;

  // Check if the contract exists at address
  if (!isAddressAContract(genericFulfillment)) {
    throw new Error(
      `Unable to find ${genericFulfillmentArtifact.contractName} on network '${hre.network.name}' at address ${fulfillment}`,
    );
  }

  return genericFulfillment;
}

export async function logGenericFulfillmentDetail(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
): Promise<void> {
  const address = await genericFulfillment.connect(signer).address;
  const typeAndVersion = await genericFulfillment.connect(signer).typeAndVersion();
  const description = await genericFulfillment.connect(signer).getDescription();
  logger.info(
    {
      address: address,
      typeAndVersion: typeAndVersion,
      description: description,
    },
    "detail:",
  );
}

export async function logGenericFulfillmentUUPSDetail(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  hre: HardhatRuntimeEnvironment,
): Promise<void> {
  const proxyAddress = await genericFulfillment.connect(signer).address;
  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(
    genericFulfillment.connect(signer).address,
  );
  const typeAndVersion = await genericFulfillment.connect(signer).typeAndVersion();
  const description = await genericFulfillment.connect(signer).getDescription();
  logger.info(
    {
      "proxy address": proxyAddress,
      "implementation address": implementationAddress,
      typeAndVersion: typeAndVersion,
      description: description,
    },
    "detail:",
  );
}

export async function grantRole(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  role: string,
  address: string,
  overrides: Overrides,
): Promise<void> {
  const logObj = { role, address };
  let tx: ContractTransaction;
  try {
    tx = await genericFulfillment.connect(signer).grantRole(role, address, overrides);
    logger.info(logObj, `grantRole() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `grantRole() failed due to:`);
    throw error;
  }
}

export async function revokeRole(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  address: string,
  role: string,
  overrides: Overrides,
): Promise<void> {
  const logObj = { role, address };
  let tx: ContractTransaction;
  try {
    tx = await genericFulfillment.connect(signer).revokeRole(role, address, overrides);
    logger.info(logObj, `revokeRole() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `revokeRole() failed due to:`);
    throw error;
  }
}

export async function setDescription(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  description: string,
  overrides?: Overrides,
): Promise<void> {
  const logObj = { description };
  let tx: ContractTransaction;
  try {
    tx = await genericFulfillment.connect(signer).setDescription(description, overrides);
    logger.info(logObj, `setDescription() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `setDescription() failed due to:`);
    throw error;
  }
}

export async function setupGenericFulfillmentAfterDeploy(
  taskArguments: TaskArguments,
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  overrides: Overrides,
) {
  // Transfer ownership
  if (taskArguments.owner) {
    await transferOwnership(genericFulfillment, signer, taskArguments.owner as string, overrides);
  }
}

export async function setupGenericFulfillmentUUPSAfterDeploy(
  taskArguments: TaskArguments,
  genericFulfillmentUUPS: GenericFulfillmentUUPS,
  signer: ethers.Wallet | SignerWithAddress,
  overrides: Overrides,
) {
  // Transfer ownership
  if (taskArguments.owner) {
    await transferOwnership(
      genericFulfillmentUUPS as unknown as GenericFulfillment,
      signer,
      taskArguments.owner as string,
      overrides,
    );
  }
}

export async function setRoles(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  roleAddresesMap: Map<string, string[]>,
  taskAction: TaskSetRolesAction,
  overrides: Overrides,
): Promise<void> {
  logger.info(`${roleAddresesMap.size ? "setting roles ..." : "no roles to be set"}`);
  if (!roleAddresesMap.size) return;

  let setRoleMethod;
  switch (taskAction) {
    case TaskSetRolesAction.GRANT:
      setRoleMethod = grantRole;
      break;
    case TaskSetRolesAction.REVOKE:
      setRoleMethod = revokeRole;
      break;
    default:
      throw new Error(`Unsupported 'taskAction': ${taskAction}`);
  }
  for (const [role, addresses] of roleAddresesMap) {
    for (const address of addresses) {
      await setRoleMethod(genericFulfillment, signer, role, address, overrides);
    }
  }
}

export async function setupTaskSet(
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
  taskName: TaskSetName,
): Promise<TaskSetData> {
  logger.warn(`running ${(taskName as string).toUpperCase()} on ${(taskArguments.mode as string).toUpperCase()} mode`);

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
  netSigner = getWalletSignerConnected(hre.network.name, process.env.PRIVATE_KEY as string);
  logger.info(`signer address: ${netSigner.address}`);

  // Execution mode setups
  if (new Set([TaskExecutionMode.FORKING]).has(taskArguments.mode)) {
    logger.info(`impersonating signer address: ${netSigner.address} ...`);
    await impersonateAccount(hre, netSigner.address);
    netSigner = await hre.ethers.getSigner(netSigner.address);
  }

  // Instantiante GenericFulfillment either on the network (nodryrun) or on the hardhat network
  logger.info(`connecting to GenericFulfillment at: ${taskArguments.address} ...`);
  const genericFulfillment = await getGenericFulfillment(hre, taskArguments.address, taskArguments.mode);
  await logGenericFulfillmentDetail(genericFulfillment, netSigner);

  // Check signer's role is DEFAULT_ADMIN_ROLE
  logger.info(`checking signer has DEFAULT_ADMIN_ROLE ...`);
  await checkAddressRole(genericFulfillment, netSigner, netSigner.address, AccessControlRole.DEFAULT_ADMIN_ROLE);

  return {
    genericFulfillment,
    netSigner,
    overrides,
  };
}

export async function transferOwnership(
  genericFulfillment: GenericFulfillment,
  signer: ethers.Wallet | SignerWithAddress,
  owner: string,
  overrides?: Overrides,
): Promise<void> {
  const logObj = { owner };
  let tx: ContractTransaction;
  try {
    tx = await genericFulfillment.connect(signer).transferOwnership(owner, overrides);
    logger.info(logObj, `transferOwnership() | Tx hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    logger.child(logObj).error(error, `transferOwnership() failed due to:`);
    throw error;
  }
}

export async function verifyGenericFulfillment(
  hre: HardhatRuntimeEnvironment,
  addressContract: string,
  description: string,
  admins: string[],
  consumers: string[],
): Promise<void> {
  setChainVerifyApiKeyEnv(hre.network.config.chainId as number, hre.config);
  await hre.run("verify:verify", {
    address: addressContract,
    constructorArguments: [description, admins, consumers],
  });
}
