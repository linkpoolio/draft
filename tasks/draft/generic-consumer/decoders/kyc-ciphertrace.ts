import { decodeFulfillBool } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const kycCiphertraceAddressesGet = (data: string) => decodeFulfillBool(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["kycCiphertraceAddressesGet(bytes32,bool)", kycCiphertraceAddressesGet],
]);
