import { ethers } from "ethers";

import type { Decoder } from "./types";
import { logBigNumberish } from "./util-logging";

export const crdNetworkAddressInfo = (data: string) => {
  const [_, kycId, kycLevel] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bytes22", "uint8"], data);
  return [kycId, logBigNumberish(kycLevel)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["crdNetworkAddressInfo(bytes32,bytes22,uint8)", crdNetworkAddressInfo],
]);
