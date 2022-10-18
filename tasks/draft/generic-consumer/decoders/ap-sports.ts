import { ethers } from "ethers";

import { decodeFulfillBytesArray } from "./generic-fulfillment";
import type { Decoder } from "./types";
import { logBigNumberish, logTimestamp } from "./util-logging";

export const apSportsScheduleGamesCreated = (data: string) => {
  const result = decodeFulfillBytesArray(data);
  const resultDecoded = result.map((resultItem: string) => {
    const gameCreated = ethers.utils.defaultAbiCoder.decode(
      ["bytes32", "uint40", "uint8", "string", "string"],
      resultItem,
    );
    return [
      gameCreated[0],
      logTimestamp(gameCreated[1]),
      logBigNumberish(gameCreated[2]),
      gameCreated[3],
      gameCreated[4],
    ];
  });
  return resultDecoded;
};
export const apSportsScheduleGamesResolved = (data: string) => {
  const result = decodeFulfillBytesArray(data);
  const resultDecoded = result.map((resultItem: string) => {
    const gameResolved = ethers.utils.defaultAbiCoder.decode(["bytes32", "uint8", "uint8", "uint8"], resultItem);
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
  ["apSportsScheduleGamesCreated(bytes32,bytes[])", apSportsScheduleGamesCreated], // NB: not tested
  ["apSportsScheduleGamesResolved(bytes32,bytes[])", apSportsScheduleGamesResolved], // NB: not tested
]);
