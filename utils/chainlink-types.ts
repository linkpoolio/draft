import type { RequestParamType } from "./chainlink-constants";
import type { JSONValue } from "./types";

// LinkPool - Consumer contracts
export interface StandardConsumerConstructorArguments {
  addressOperator: string;
  addressLink: string;
}

// LinkPool - Tools
export interface ChainlinkRequestParam {
  name: string;
  type: RequestParamType;
  value: JSONValue;
  valueTypes?: string[];
}
