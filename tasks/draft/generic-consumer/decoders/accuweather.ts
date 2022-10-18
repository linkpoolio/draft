import { ethers } from "ethers";

import type { Decoder } from "./types";
import { logBigNumberish, logTimestamp } from "./util-logging";

export const decodeLocation = (location: string) => {
  const [[locationKey, name, countryCode]] = ethers.utils.defaultAbiCoder.decode(
    ["tuple(uint256,string,bytes2)"],
    location,
  );
  return [logBigNumberish(locationKey), name, Buffer.from(countryCode.slice(2), "hex").toString()];
};
export const decodeCurrentConditions = (currentConditions: string) => {
  const [
    [
      timestamp, // uint256
      precipitationPast12Hours, // uint24
      precipitationPast24Hours, // uint24
      precipitationPastHour, // uint24
      pressure, // uint24
      temperature, // int16
      windDirectionDegrees, // uint16
      windSpeed, // uint16
      precipitationType, // uint8
      relativeHumidity, // uint8
      uvIndex, // uint8
      weatherIcon, // uint8
    ],
  ] = ethers.utils.defaultAbiCoder.decode(
    ["tuple(uint256,uint24,uint24,uint24,uint24,int16,uint16,uint16,uint8,uint8,uint8,uint8)"],
    currentConditions,
  );
  return [
    logTimestamp(timestamp),
    logBigNumberish(precipitationPast12Hours),
    logBigNumberish(precipitationPast24Hours),
    logBigNumberish(precipitationPastHour),
    logBigNumberish(pressure),
    logBigNumberish(temperature),
    logBigNumberish(windDirectionDegrees),
    logBigNumberish(windSpeed),
    logBigNumberish(precipitationType),
    logBigNumberish(relativeHumidity),
    logBigNumberish(uvIndex),
    logBigNumberish(weatherIcon),
  ];
};
export const accuweatherLocation = (data: string) => {
  const [_, isFound, result] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bool", "bytes"], data);
  if (!isFound) return [isFound, "0x"];
  return [isFound, decodeLocation(result)];
};
export const accuweatherCurrentConditions = (data: string) => {
  const [_, currentConditions] = ethers.utils.defaultAbiCoder.decode(["bytes32", "bytes"], data);
  return decodeCurrentConditions(currentConditions);
};
export const accuweatherLocationCurrentConditions = (data: string) => {
  const [_, isFound, location, currentConditions] = ethers.utils.defaultAbiCoder.decode(
    ["bytes32", "bool", "bytes", "bytes"],
    data,
  );
  if (!isFound) return [isFound, "0x"];
  return [isFound, decodeLocation(location), decodeCurrentConditions(currentConditions)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["accuweatherLocation(bytes32,bytes)", accuweatherLocation],
  ["accuweatherCurrentConditions(bytes32,bytes)", accuweatherCurrentConditions],
  ["accuweatherLocationCurrentConditions(bytes32,bytes)", accuweatherLocationCurrentConditions],
]);
