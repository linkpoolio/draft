import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const smartzipPropertyAvmPrice = (data: string) => decodeFulfillUint256(data);
export const smartzipPropertyDetailsPrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["smartzipPropertyAvmPrice(bytes32,uint256)", smartzipPropertyAvmPrice],
  ["smartzipPropertyDetailsPrice(bytes32,uint256)", smartzipPropertyDetailsPrice],
]);
