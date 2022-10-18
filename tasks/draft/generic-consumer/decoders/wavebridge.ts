import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const wavebridgeCmxDaily = (data: string) => decodeFulfillUint256(data);
export const wavebridgeKimpDaily = (data: string) => decodeFulfillUint256(data);
export const wavebridgeKimpRealtime = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["wavebridgeCmxDaily(bytes32,int256)", wavebridgeCmxDaily],
  ["wavebridgeKimpDaily(bytes32,int256)", wavebridgeKimpDaily],
  ["wavebridgeKimpRealtime(bytes32,int256)", wavebridgeKimpRealtime],
]);
