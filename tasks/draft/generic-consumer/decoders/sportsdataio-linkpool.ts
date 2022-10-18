import { decodeFulfillBytes32Array } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish, logHexStr, logTimestampFromHexStr } from "./util-logging";

export const sportsdataLpScheduleGamesCreated = (data: string) => {
  const result = decodeFulfillBytes32Array(data);
  const resultDecoded = result.map((resultItem: string) => {
    return [
      logBigNumberish(`0x${resultItem.slice(2, 10)}`),
      logTimestampFromHexStr(`0x${resultItem.slice(10, 20)}`),
      logHexStr(resultItem.slice(20, 40)),
      logHexStr(resultItem.slice(40)),
      // NB: alternative way stripping out leading zeros
      //   Buffer.from(ethers.utils.hexStripZeros(`0x${resultItem.slice(20, 40)}`).slice(2), "hex").toString(),
      //   Buffer.from(ethers.utils.hexStripZeros(`0x${resultItem.slice(40, 60)}`).slice(2), "hex").toString(),
    ];
  });
  return resultDecoded;
};
export const sportsdataLpScheduleGamesResolved = (data: string) => {
  const result = decodeFulfillBytes32Array(data);
  const resultDecoded = result.map((resultItem: string) => {
    return [
      logBigNumberish(`0x${resultItem.slice(2, 10)}`),
      logBigNumberish(`0x${resultItem.slice(10, 12)}`),
      logBigNumberish(`0x${resultItem.slice(12, 14)}`),
      logHexStr(resultItem.slice(14)),
      // NB: alternative way stripping out leading zeros
      //   Buffer.from(ethers.utils.hexStripZeros(`0x${resultItem.slice(14)}`).slice(2), "hex")
      //     .toString()
      //     .replace(/\0/g, ""),
    ];
  });
  return resultDecoded;
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["sportsdataLpScheduleGamesCreated(bytes32,bytes32[])", sportsdataLpScheduleGamesCreated],
  ["sportsdataLpScheduleGamesResolved(bytes32,bytes32[])", sportsdataLpScheduleGamesResolved],
]);
