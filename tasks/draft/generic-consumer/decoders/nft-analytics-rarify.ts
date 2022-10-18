import { ethers } from "ethers";

import type { Decoder } from "./types";
import { logBigNumberish, logTimestamp } from "./util-logging";

export const nftAnalyticsRarifyFloorpricesGet = (data: string) => {
  const [_, timestamp, floorprice] = ethers.utils.defaultAbiCoder.decode(["bytes32", "uint256", "uint256"], data);
  return [logTimestamp(timestamp), logBigNumberish(floorprice)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["nftAnalyticsRarifyFloorpricesGet(bytes32,uint256,uint256)", nftAnalyticsRarifyFloorpricesGet],
]);
