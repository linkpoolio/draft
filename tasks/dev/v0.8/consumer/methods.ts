import { HardhatRuntimeEnvironment } from "hardhat/types";

import { setChainVerifyApiKeyEnv } from "../../../../utils/verification";

// Verify a consumer contract whose constructor requires [LINK address,oracle contract address]
export async function verifyStandardConsumer(
  hre: HardhatRuntimeEnvironment,
  addressContract: string,
  addressLink: string,
  addressOperator: string,
  contract?: string,
): Promise<void> {
  setChainVerifyApiKeyEnv(hre.network.config.chainId as number, hre.config);
  await hre.run("verify:verify", {
    address: addressContract,
    constructorArguments: [addressLink, addressOperator],
    contract,
  });
}
