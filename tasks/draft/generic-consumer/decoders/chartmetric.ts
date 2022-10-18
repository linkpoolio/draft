import { ethers } from "ethers";

import { decodeFulfillBytes32 } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish } from "./util-logging";

export const chartmetricStatistics = (data: string) => {
  const result = decodeFulfillBytes32(data);
  const [youtube, spotify, tiktok] = ethers.utils.defaultAbiCoder.decode(["uint64", "uint64", "uint64"], result);
  return [logBigNumberish(youtube), logBigNumberish(spotify), logBigNumberish(tiktok)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["chartmetricStatistics(bytes32,bytes32)", chartmetricStatistics],
]);
