import { decodeFulfillBool } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const venraiSanctions = (data: string) => decodeFulfillBool(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["venraiSanctions(bytes32,bool)", venraiSanctions],
]);
