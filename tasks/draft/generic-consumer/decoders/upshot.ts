import { decodeFulfillBytes32, decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish, logTimestampFromHexStr } from "./util-logging";

export const upshotAssetPrice = (data: string) => decodeFulfillUint256(data);
export const upshotStatisticsFloorprice = (data: string) => decodeFulfillUint256(data);
export const upshotStatisticsMarketcap = (data: string) => decodeFulfillUint256(data);
export const upshotStatisticsStatistics = (data: string) => {
  const result = decodeFulfillBytes32(data);
  return [logBigNumberish(`0x${result.slice(2, 34)}`), logBigNumberish(`0x${result.slice(34)}`)];
};
export const upshotStatisticsTimestampFloorprice = (data: string) => {
  const result = decodeFulfillBytes32(data);
  return [logTimestampFromHexStr(`0x${result.slice(2, 34)}`), logBigNumberish(`0x${result.slice(34)}`)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["upshotAssetPrice(bytes32,uint256)", upshotAssetPrice],
  ["upshotStatisticsFloorprice(bytes32,uint256)", upshotStatisticsFloorprice],
  ["upshotStatisticsMarketcap(bytes32,uint256)", upshotStatisticsMarketcap],
  ["upshotStatisticsStatistics(bytes32,bytes32)", upshotStatisticsStatistics as Decoder], // NB: not tested
  ["upshotStatisticsTimestampFloorprice(bytes32,bytes32)", upshotStatisticsTimestampFloorprice as Decoder],
]);
