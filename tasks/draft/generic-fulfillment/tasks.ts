import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, logger } from "ethers";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import type { GenericFulfillment, GenericFulfillmentUUPS } from "../../../src/types";
import { ChainId } from "../../../utils/constants";
import {
  getNetworkLinkAddressDeployingOnHardhat,
  getNumberOfConfirmations,
  getOverrides,
  validateProposedOwnerTaskArgument,
} from "../../../utils/deployment";
import { getWalletSignerConnected } from "../../../utils/signers";
import {
  address as typeAddress,
  addressesArray as typeAddressesArray,
  optionsArray as typeOptionsArray,
  stringArray as typeStringArray,
} from "../../../utils/task-arguments-validations";
import { verifyByAddress } from "../../../utils/verification";
import { checkPrivateKey } from "../methods";
import { AccessControlRole, TaskExecutionMode, TaskSetName, TaskSetRolesAction } from "./constants";
import {
  getGenericFulfillment,
  grantRole,
  logGenericFulfillmentDetail,
  logGenericFulfillmentUUPSDetail,
  revokeRole,
  setDescription,
  setupGenericFulfillmentAfterDeploy,
  setupGenericFulfillmentUUPSAfterDeploy,
  setupTaskSet,
  transferOwnership,
  verifyGenericFulfillment,
} from "./methods";

task("draft:genericfulfillment:deploy")
  .addParam("description", "The contract description", undefined, types.string)
  .addParam("admins", "The addresses to grant with DEFAULT_ADMIN_ROLE role", [], typeAddressesArray)
  .addParam("consumers", "The addresses to grant with CONSUMER_ROLE role", [], typeAddressesArray)
  // Configuration after deployment
  .addFlag("setup", "Configs the GenericFulfillment after deployment")
  .addOptionalParam("owner", "The address to transfer the ownership", undefined, typeAddress)
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

    // Deploy
    const genericFulfillmentFactory = await hre.ethers.getContractFactory("GenericFulfillment");
    const genericFulfillment = (await genericFulfillmentFactory
      .connect(signer)
      .deploy(
        taskArguments.description,
        taskArguments.admins,
        taskArguments.consumers,
        overrides,
      )) as GenericFulfillment;
    logger.info(
      `GenericFulfillment deployed to: ${genericFulfillment.address} | Tx hash: ${genericFulfillment.deployTransaction.hash}`,
    );
    await genericFulfillment
      .connect(signer)
      .deployTransaction.wait(getNumberOfConfirmations(hre.network.config.chainId, 5));

    // Setup
    if (taskArguments.setup) {
      await setupGenericFulfillmentAfterDeploy(taskArguments, genericFulfillment, signer, overrides);
    }
    if (!taskArguments.verify) return;

    // Verify
    // NB: contract verification request may fail if the contract address does not have bytecode. Wait until it's mined
    await verifyGenericFulfillment(
      hre,
      genericFulfillment.address,
      taskArguments.description,
      taskArguments.admins,
      taskArguments.consumers,
    );
  });

task("draft:genericfulfillment:get-detail")
  .addParam("address", "The GenericFulfillment contract address", undefined, typeAddress)
  .addFlag("uups", "The GenericFulfillment contract is UUPS proxy")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const [signer] = await hre.ethers.getSigners();
    logger.info(`connecting to GenericFulfillment at ${taskArguments.address} ...`);
    const genericFulfillment = await getGenericFulfillment(hre, taskArguments.address, TaskExecutionMode.PROD);
    if (taskArguments.uups) {
      await logGenericFulfillmentUUPSDetail(genericFulfillment, signer, hre);
    } else {
      await logGenericFulfillmentDetail(genericFulfillment, signer);
    }
  });

task("draft:genericfulfillment:have-roles", "Returns whether an account has a role")
  .addParam("address", "The GenericFulfillment contract address", undefined, typeAddress)
  .addParam("accounts", "The array of accounts", undefined, typeAddressesArray)
  .addParam("roles", "The array of roles", undefined, typeStringArray)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const [signer] = await hre.ethers.getSigners();
    logger.info(`connecting to GenericFulfillment at ${taskArguments.address} ...`);
    const genericFulfillment = await getGenericFulfillment(hre, taskArguments.address, TaskExecutionMode.PROD);
    await logGenericFulfillmentDetail(genericFulfillment, signer);

    for (const [idx, address] of (taskArguments.accounts as string[]).entries()) {
      const role = (taskArguments.roles as string[])[idx];
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
      const hasRole = await genericFulfillment.connect(signer).hasRole(roleAsBytes32, address);
      logger.info(`address ${address} ${hasRole ? "has" : "does not have"} role: ${roleAsBytes32} ('${role}')`);
    }
  });

task("draft:genericfulfillment:set-roles", "Grant, revoke or renounce roles")
  .addParam("address", "The GenericFulfillment contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addParam("accounts", "The array of accounts", undefined, typeAddressesArray)
  .addParam("roles", "The array of roles", undefined, typeStringArray)
  .addParam("action", "The action to perform", undefined, typeOptionsArray(Object.values(TaskSetRolesAction)))
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericFulfillment, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.SET_ROLES);

    let setRoleMethod;
    switch (taskArguments.action) {
      case TaskSetRolesAction.GRANT:
        setRoleMethod = grantRole;
        break;
      case TaskSetRolesAction.REVOKE:
        setRoleMethod = revokeRole;
        break;
      default:
        throw new Error(`Unsupported 'action': ${taskArguments.action}`);
    }
    for (const [idx, address] of (taskArguments.accounts as string[]).entries()) {
      const role = (taskArguments.roles as string[])[idx];
      let roleAsBytes32;
      switch (role) {
        case AccessControlRole.CONSUMER_ROLE:
          roleAsBytes32 = await genericFulfillment.connect(netSigner).CONSUMER_ROLE();
          break;
        case AccessControlRole.DEFAULT_ADMIN_ROLE:
          roleAsBytes32 = await genericFulfillment.connect(netSigner).DEFAULT_ADMIN_ROLE();
          break;
        default:
          throw new Error(`Unsupported 'role': ${role}`);
      }
      const hasRole = await genericFulfillment.connect(netSigner).hasRole(roleAsBytes32, address);
      if (
        (taskArguments.action === TaskSetRolesAction.GRANT && hasRole) ||
        (taskArguments.action === TaskSetRolesAction.REVOKE && !hasRole)
      ) {
        logger.warn(
          `address ${address} ${
            taskArguments.action === TaskSetRolesAction.GRANT ? "already has" : "does not have"
          } role: ${roleAsBytes32} ('${role}'). Skipped`,
        );
        continue;
      }
      await setRoleMethod(genericFulfillment, netSigner, roleAsBytes32, address, overrides);
    }

    logger.info("*** Set roles task finished successfully ***");
  });

task("draft:genericfulfillment:set-stuff", "Set all kind of variables in the contract")
  .addParam("address", "The GenericFulfillment contract address", undefined, typeAddress)
  .addParam(
    "mode",
    "The execution mode",
    TaskExecutionMode.FORKING,
    typeOptionsArray([TaskExecutionMode.FORKING, TaskExecutionMode.PROD]),
  )
  .addOptionalParam("description", "The new 'description' value", undefined, types.string)
  .addOptionalParam("owner", "The address to transfer the ownership", undefined, typeAddress)
  // Tx customisation (ethers.js Overrides)
  .addFlag("overrides", "Customise the tx overrides")
  .addOptionalParam("gaslimit", "The tx gasLimit", undefined, types.int)
  .addOptionalParam("txtype", "The tx gas type (0 or 2)", undefined, types.int)
  .addOptionalParam("gasprice", "Type 0 tx gasPrice", undefined, types.float)
  .addOptionalParam("gasmaxfee", "Type 2 tx maxFeePerGas", undefined, types.float)
  .addOptionalParam("gasmaxpriority", "Type 2 tx maxPriorityFeePerGas", undefined, types.float)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { genericFulfillment, netSigner, overrides } = await setupTaskSet(taskArguments, hre, TaskSetName.SET_STUFF);

    // Set description
    if (taskArguments.description) {
      await setDescription(genericFulfillment, netSigner, taskArguments.description, overrides);
    }

    // Transfer ownerwhip
    if (taskArguments.owner) {
      await transferOwnership(genericFulfillment, netSigner, taskArguments.owner, overrides);
    }

    logger.info("*** Set stuff task finished successfully ***");
  });

task(
  "draft:genericfulfillmentuups:deploy",
  "Create or upgrade a UUPS proxy given a GenericFulfillmentUUPS to use as implementation",
)
  .addParam("name", "The GenericFulfillmentUUPS implementation name", undefined, types.string)
  .addParam("description", "The contract description", undefined, types.string)
  .addParam("admins", "The addresses to grant with DEFAULT_ADMIN_ROLE role", [], typeAddressesArray)
  .addParam("consumers", "The addresses to grant with CONSUMER_ROLE role", [], typeAddressesArray)
  // Upgrade the implementation contract
  .addFlag("upgrade", "Upgrade a UUPS proxy at a specified address to a new implementation contract")
  .addOptionalParam("address", "The ERC1967Proxy contract address", undefined, typeAddress)
  // Configuration after deployment and/or upgrade
  .addFlag("setup", "Configs the GenericFulfillmentUUPS after deployment")
  .addOptionalParam("owner", "The address to transfer the ownership", undefined, typeAddress)
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

    // Custom validations
    if (taskArguments.upgrade && !taskArguments.address) {
      throw new Error(`Argument 'fulfillment' is required when upgrading`);
    }
    validateProposedOwnerTaskArgument(signer.address, taskArguments.owner);

    // Get LINK address (by network)
    const addressLink = await getNetworkLinkAddressDeployingOnHardhat(hre);

    // Deploy ERC1967Proxy (proxy) and GenericFulfillmentUUPS (implementation) contracts, or
    // upgrade the implementation contract
    const genericFulfillmentUUPSFactory = await hre.ethers.getContractFactory(taskArguments.name, signer);
    let genericFulfillmentUUPSProxy: GenericFulfillmentUUPS;

    if (taskArguments.upgrade) {
      genericFulfillmentUUPSProxy = (await hre.upgrades.upgradeProxy(
        taskArguments.address,
        genericFulfillmentUUPSFactory,
      )) as GenericFulfillmentUUPS;
    } else {
      genericFulfillmentUUPSProxy = (await hre.upgrades.deployProxy(
        genericFulfillmentUUPSFactory,
        [addressLink, taskArguments.description as string, taskArguments.admins, taskArguments.consumers],
        {
          initializer: "initialize",
          kind: "uups",
        },
      )) as GenericFulfillmentUUPS;
    }

    await genericFulfillmentUUPSProxy.deployed();
    const proxyMsg = taskArguments.upgrade ? "upgraded" : `deployed to: ${genericFulfillmentUUPSProxy.address}`;
    logger.info(`ERC1967Proxy ${proxyMsg} | Tx hash: ${genericFulfillmentUUPSProxy.deployTransaction.hash}`);
    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(
      genericFulfillmentUUPSProxy.address,
    );
    logger.info(`${taskArguments.name} deployed to: ${implementationAddress}`);

    // Setup
    if (taskArguments.setup) {
      await setupGenericFulfillmentUUPSAfterDeploy(taskArguments, genericFulfillmentUUPSProxy, signer, overrides);
    }
    if (!taskArguments.verify) return;

    // Verify
    // NB: contract verification request may fail if the contract address does not have bytecode. Wait until it's mined
    await verifyByAddress(hre, implementationAddress);
  });

task("draft:genericfulfillmentuups:verify")
  .addParam("address", "The deployed contract address", undefined, typeAddress)
  .setAction(async function (taskArguments: TaskArguments, hre) {
    await verifyByAddress(hre, taskArguments.address);
  });
