import { BigNumberish, ethers } from "ethers";

import type { Decoder } from "./types";
import { logBigNumberish } from "./util-logging";

// Decoders for EA results based on Solidity standard data types
export const decodeFulfillAddress = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "address"], data);
  return result;
};

export const decodeFulfillAddressArray = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "address[]"], data);
  return result;
};

export const decodeFulfillBool = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bool"], data);
  return result;
};

export const decodeFulfillBoolArray = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bool[]"], data);
  return result;
};

export const decodeFulfillBytes = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bytes"], data);
  return result;
};

export const decodeFulfillBytesArray = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bytes[]"], data);
  return result;
};

export const decodeFulfillBytes32 = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bytes32"], data);
  return result;
};

export const decodeFulfillBytes32Array = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bytes32[]"], data);
  return result;
};

export const decodeFulfillInt256 = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "int256"], data);
  return logBigNumberish(result as BigNumberish);
};

export const decodeFulfillInt256Array = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "int256[]"], data);
  return result.map((resultItem: BigNumberish) => logBigNumberish(resultItem));
};

export const decodeFulfillString = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "string"], data);
  return result;
};

export const decodeFulfillStringArray = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "string[]"], data);
  return result;
};

export const decodeFulfillUint256 = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "uint256"], data);
  return logBigNumberish(result as BigNumberish);
};

export const decodeFulfillUint256Array = (data: string) => {
  const [_, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "uint256[]"], data);
  return result.map((resultItem: BigNumberish) => logBigNumberish(resultItem));
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["(bytes32,address)", decodeFulfillAddress],
  ["(bytes32,address[])", decodeFulfillAddressArray],
  ["(bytes32,bool)", decodeFulfillBool],
  ["(bytes32,bool[])", decodeFulfillBoolArray],
  ["(bytes32,bytes)", decodeFulfillBytes],
  ["(bytes32,bytes[])", decodeFulfillBytesArray],
  ["(bytes32,bytes32)", decodeFulfillBytes32],
  ["(bytes32,bytes32[])", decodeFulfillBytes32Array],
  ["(bytes32,int256)", decodeFulfillInt256],
  ["(bytes32,int256[])", decodeFulfillInt256Array],
  ["(bytes32,string)", decodeFulfillString],
  ["(bytes32,string[])", decodeFulfillStringArray],
  ["(bytes32,uint256)", decodeFulfillUint256],
  ["(bytes32,uint256[])", decodeFulfillUint256Array],
]);
