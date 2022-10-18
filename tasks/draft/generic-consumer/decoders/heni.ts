import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const heniPrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["heniPrice(bytes32,uint256)", heniPrice],
]);
