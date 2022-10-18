import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const artcentralTami = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["artcentralTami(bytes32,uint256)", artcentralTami],
]);
