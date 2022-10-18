import { BigNumber, BigNumberish } from "ethers";

import { BIG_NUMBER_MAX_SAFE_INTEGER } from "../../../../utils/bignumber";

export function convertBigNumberToNumberOrString(value: BigNumber): number | string {
  return value.gt(BIG_NUMBER_MAX_SAFE_INTEGER) ? value.toString() : value.toNumber();
}

export function logBigNumberish(value: BigNumberish): number | string {
  const valueBigNumber = BigNumber.isBigNumber(value) ? value : BigNumber.from(`${value}`);
  return convertBigNumberToNumberOrString(valueBigNumber);
}

export function logHexStr(value: string): string {
  return `0x${value} (${Buffer.from(value, "hex").toString().replace(/\0/g, "")})`;
}

export function logTimestamp(value: number | string): string {
  return `${value} (${new Date(Number(value) * 1000).toISOString()})`;
}

export function logTimestampFromHexStr(value: string): string {
  return logTimestamp(logBigNumberish(value));
}
