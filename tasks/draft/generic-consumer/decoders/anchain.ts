import { decodeFulfillString } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const anchainCategory = (data: string) => decodeFulfillString(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["anchainCategory(bytes32,string)", anchainCategory],
]);
