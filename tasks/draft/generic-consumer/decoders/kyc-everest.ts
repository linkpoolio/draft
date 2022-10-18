import { ethers } from "ethers";

import type { Decoder } from "./types";
import { logBigNumberish, logTimestamp } from "./util-logging";

export const kycEverestAddressesGet = (data: string) => {
  const [_, kycStatus, kycTimestamp] = ethers.utils.defaultAbiCoder.decode(["bytes32", "uint8", "uint40"], data);
  return [logBigNumberish(kycStatus), logTimestamp(kycTimestamp)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["kycEverestAddressesGet(bytes32,uint8,uint40)", kycEverestAddressesGet],
]);
