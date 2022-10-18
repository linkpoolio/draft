import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const tradermadePrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["tradermadePrice(bytes32,uint256)", tradermadePrice],
]);
