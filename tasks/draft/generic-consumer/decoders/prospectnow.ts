import { decodeFulfillUint256 } from "./generic-fulfillment";
import type { Decoder } from "./types";

export const prospectnowTerritoryAnalizerAvgPrice = (data: string) => decodeFulfillUint256(data);

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["prospectnowTerritoryAnalizerAvgPrice(bytes32,uint256)", prospectnowTerritoryAnalizerAvgPrice],
]);
