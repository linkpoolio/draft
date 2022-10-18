import { ethers } from "ethers";

import type { Decoder } from "./types";
import { logBigNumberish } from "./util-logging";

export const freelanceJobsLanceriaJobsGet = (data: string) => {
  const [_, employer, freelancer, paymentAmount] = ethers.utils.defaultAbiCoder.decode(
    ["bytes32", "address", "address", "uint256"],
    data,
  );
  return [employer, freelancer, logBigNumberish(paymentAmount)];
};

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ["freelanceJobsLanceriaJobsGet(bytes32,address,address,uint256)", freelanceJobsLanceriaJobsGet],
]);
