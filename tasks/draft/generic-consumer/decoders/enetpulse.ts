import { decodeFulfillBytes } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const enetpulseGameDetails = (data: string) => {
  const result = decodeFulfillBytes(data);
  return Buffer.from(result.slice(2), "hex").toString();
};

export const enetpulseGameScore = (data: string) => {
  const result = decodeFulfillBytes(data);
  return Buffer.from(result.slice(2), "hex").toString();
};

export const enetpulseSchedule = (data: string) => {
  const result = decodeFulfillBytes(data);
  return Buffer.from(result.slice(2), "hex").toString();
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["enetpulseGameDetails(bytes32,bytes)", enetpulseGameDetails],
  ["enetpulseGameScore(bytes32,bytes)", enetpulseGameScore],
  ["enetpulseSchedule(bytes32,bytes)", enetpulseSchedule],
]);
