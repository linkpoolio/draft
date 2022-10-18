import { ethers } from "ethers";

import { decodeFulfillBytesArray } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish, logTimestamp } from "./util-logging";

export const therundownLpScheduleGamesCreated_v2_0 = (data: string) => {
  const result = decodeFulfillBytesArray(data);
  const resultDecoded = result.map((resultItem: string) => {
    const gameCreated = ethers.utils.defaultAbiCoder.decode(
      ["tuple(bytes32 gameId, uint256 startTime, string homeTeam, string awayTeam)"],
      resultItem,
    )[0];
    return [gameCreated[0], logTimestamp(gameCreated[1]), gameCreated[2], gameCreated[3]];
  });
  return resultDecoded;
};
export const therundownLpScheduleGamesResolved_v2_0 = (data: string) => {
  const result = decodeFulfillBytesArray(data);
  const resultDecoded = result.map((resultItem: string) => {
    const gameResolved = ethers.utils.defaultAbiCoder.decode(
      ["tuple(bytes32 gameId, uint8 homeScore, uint8 awayScore, uint8 statusId)"],
      resultItem,
    )[0];
    return [
      gameResolved[0],
      logBigNumberish(gameResolved[1]),
      logBigNumberish(gameResolved[2]),
      logBigNumberish(gameResolved[3]),
    ];
  });
  return resultDecoded;
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["therundownLpScheduleGamesCreated_v2_0(bytes32,bytes[])", therundownLpScheduleGamesCreated_v2_0],
  ["therundownLpScheduleGamesResolved_v2_0(bytes32,bytes[])", therundownLpScheduleGamesResolved_v2_0],
]);
