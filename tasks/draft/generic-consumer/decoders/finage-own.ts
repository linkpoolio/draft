import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const finagePrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["finagePrice(bytes32,uint256)", finagePrice],
]);
