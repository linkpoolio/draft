import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const twelvedataPrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["twelvedataPrice(bytes32,uint256)", twelvedataPrice],
]);
