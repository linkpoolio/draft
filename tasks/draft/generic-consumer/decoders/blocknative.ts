// import { decodeFulfillBytes32 } from "./generic-fulfillment";
import { decodeFulfillString } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const blocknativeBlockpricesGetLegacy = (data: string) => {
  // NB: as a JSON job data was bytes32 and it was decoded via Buffer.from().
  // As a TOML job the EA result failes to be encoded via ethabiencode as it is != 32 characters
  // A temporary solution is to send the result as string
  // const result = decodeFulfillBytes32(data);
  // return Buffer.from(result.slice(2), "hex").toString();
  const result = decodeFulfillString(data);
  return result;
};

export const blocknativeBlockpricesGetEip1559 = (data: string) => {
  // NB: as a JSON job data was bytes32 and it was decoded via Buffer.from().
  // As a TOML job the EA result failes to be encoded via ethabiencode as it is != 32 characters
  // A temporary solution is to send the result as string
  // const result = decodeFulfillBytes32(data);
  // return Buffer.from(result.slice(2), "hex").toString();
  const result = decodeFulfillString(data);
  return result;
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["blocknativeBlockpricesGetLegacy(bytes32,bytes32)", blocknativeBlockpricesGetLegacy],
  ["blocknativeBlockpricesGetEip1559(bytes32,bytes32)", blocknativeBlockpricesGetEip1559],
]);
