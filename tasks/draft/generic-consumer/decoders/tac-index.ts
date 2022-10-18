import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const tacIndexPrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["tacIndexPrice(bytes32,uint256)", tacIndexPrice],
]);
