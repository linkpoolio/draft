import { decodeFulfillBool } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const dnsQueryDnsProofCheckRecord = (data: string) => decodeFulfillBool(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["dnsQueryDnsProofCheckRecord(bytes32,bool)", dnsQueryDnsProofCheckRecord],
]);
