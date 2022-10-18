import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const nftAnalyticsNftperpTwapsGet = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["nftAnalyticsNftperpTwapsGet(bytes32,uint256)", nftAnalyticsNftperpTwapsGet],
]);
