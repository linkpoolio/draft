import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { BigNumber, ethers } from "ethers";

import { GenericConsumer } from "../../../src/types";
import type { ChainlinkRequestParam } from "../../../utils/chainlink-types";
import { ChainId } from "../../../utils/constants";
import { Overrides } from "../../../utils/types";
import { ChainlinkNodeId, ExternalAdapterId, RequestType } from "./constants";

export interface ExternalAdapter {
  id: ExternalAdapterId;
  version: string;
}
export interface Description {
  adapter: null | ExternalAdapter;
  chainId: ChainId;
  jobId: number;
  jobCase: number;
  jobName: string;
  nodeId: ChainlinkNodeId;
  notes: null | string;
}

export interface RequestData {
  externalJobId: string;
  oracleAddr: string;
  payment: string;
  callbackAddr: string;
  callbackFunctionName: string;
  requestType: number;
  requestParams: ChainlinkRequestParam[];
}

export interface Schedule {
  startAt: string;
  interval: string;
}

export interface Entry {
  description: Description;
  requestData: RequestData;
  schedule: Schedule;
  inactive: boolean;
}

export interface RequestDataConverted {
  key: string;
  specId: string;
  oracle: string;
  payment: BigNumber;
  callbackAddr: string;
  callbackFunctionSignature: string;
  requestType: RequestType;
  buffer: string;
}

export interface ScheduleConverted {
  startAt: BigNumber;
  interval: BigNumber;
}

export interface EntryConverted extends RequestDataConverted, ScheduleConverted {
  inactive: boolean;
}

export interface TaskSetData {
  genericConsumer: GenericConsumer;
  netSigner: ethers.Wallet | SignerWithAddress;
  overrides: Overrides;
  entries?: Entry[];
}

export interface GenericConsumerLogConfig {
  detail?: boolean;
  keys?: boolean;
  keepers?: boolean;
  entries?: boolean;
  lastRequestTimestamps?: boolean;
}

export interface EntryRequested {
  entry: EntryConverted;
  requestId: string;
  callbackFunctionName?: string;
}
