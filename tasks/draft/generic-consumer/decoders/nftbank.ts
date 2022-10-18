import { decodeFulfillBytes32, decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish, logTimestampFromHexStr } from "./util-logging";

export const nftbankEstimateTokenPrice = (data: string) => decodeFulfillUint256(data);
export const nftbankFloorPricePrice = (data: string) => decodeFulfillUint256(data);
export const nftbankFloorPriceTimestampFloorprice = (data: string) => {
  const result = decodeFulfillBytes32(data);
  return [logTimestampFromHexStr(`0x${result.slice(2, 34)}`), logBigNumberish(`0x${result.slice(34)}`)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["nftbankEstimateTokenPrice(bytes32,uint256)", nftbankEstimateTokenPrice],
  ["nftbankFloorPricePrice(bytes32,uint256)", nftbankFloorPricePrice],
  ["nftbankFloorPriceTimestampFloorprice(bytes32,bytes32)", nftbankFloorPriceTimestampFloorprice as Decoder],
]);
