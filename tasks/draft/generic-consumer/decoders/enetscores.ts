import { BigNumber } from "ethers";

import { decodeFulfillBytesArray } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish, logTimestampFromHexStr } from "./util-logging";

export const enetscoresScheduleGamesCreated = (data: string) => {
  const result = decodeFulfillBytesArray(data);
  const resultDecoded = result.map((resultItem: string) => {
    const homeTeamLength = BigNumber.from(`0x${resultItem.slice(20, 22)}`).toNumber();
    const endHomeTeam = 22 + homeTeamLength * 2;
    return [
      logBigNumberish(`0x${resultItem.slice(2, 10)}`),
      logTimestampFromHexStr(`0x${resultItem.slice(10, 20)}`),
      Buffer.from(resultItem.slice(22, endHomeTeam), "hex").toString(),
      Buffer.from(resultItem.slice(endHomeTeam), "hex").toString(),
    ];
  });
  return resultDecoded;
};

export const enetscoresScheduleGamesResolved = (data: string) => {
  const result = decodeFulfillBytesArray(data);
  const resultDecoded = result.map((resultItem: string) => {
    return [
      logBigNumberish(`0x${resultItem.slice(2, 10)}`),
      logBigNumberish(`0x${resultItem.slice(10, 12)}`),
      logBigNumberish(`0x${resultItem.slice(12, 14)}`),
      Buffer.from(resultItem.slice(14), "hex").toString(),
    ];
  });
  return resultDecoded;
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["enetscoresScheduleGamesCreated(bytes32,bytes[])", enetscoresScheduleGamesCreated],
  ["enetscoresScheduleGamesResolved(bytes32,bytes[])", enetscoresScheduleGamesResolved],
]);
