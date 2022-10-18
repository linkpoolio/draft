export enum OperatorFunctionId {
  FULFILL_ORACLE_REQUEST = "0x4ab0d190",
  FULFILL_ORACLE_REQUEST_2 = "0x6ae0bc76",
}

export const operatorFunctionIdToFunctionSignature: ReadonlyMap<OperatorFunctionId, string> = new Map([
  [OperatorFunctionId.FULFILL_ORACLE_REQUEST, "fulfillOracleRequest(bytes32,uint256,address,bytes4,uint256,bytes32)"],
  [OperatorFunctionId.FULFILL_ORACLE_REQUEST_2, "fulfillOracleRequest2(bytes32,uint256,address,bytes4,uint256,bytes)"],
]);
