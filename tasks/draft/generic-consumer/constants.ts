import { BigNumber } from "ethers";

export const DUMMY_SET_CODE_BYTES = "0x70657065"; // pepe

export const MIN_GAS_LIMIT_PERFORM_UPKEEP = BigNumber.from("300000");

export const ORACLE_ARGS_VERSION = 1;
export const OPERATOR_ARGS_VERSION = 2;

export enum RequestType {
  ORACLE = 0,
  OPERATOR = 1,
}

export enum TaskExecutionMode {
  DRYRUN = "dryrun", // Executed on an instance of Hardhat Network (from the scratch)
  FORKING = "forking", // Executed on an instance of Hardhat Network that forks another network
  PROD = "prod", // Executed on a network
}

export enum TaskRequestAction {
  REQUEST_DATA = "request_data",
  REQUEST_DATA_AND_FORWARD = "request_data_and_forward",
}

export enum TaskSetName {
  ADD_FUNDS = "add_funds",
  IMPORT_FILE = "import_file",
  PERFORM_UPKEEP = "perform_upkeep",
  REMOVE_LOT = "remove_lot",
  REMOVE_ENTRY = "remove_entry",
  REQUEST = "request",
  REQUEST_FILE_ENTRY = "request_file_entry",
  SET_ENTRY = "set_entry",
  SET_PAUSE = "set_pause",
  SET_STUFF = "set_stuff",
  WITHDRAW_FUNDS = "withdraw_funds",
}

export enum TaskSetPauseAction {
  PAUSE = "pause",
  UNPAUSE = "unpause",
}

export enum TaskSetRolesAction {
  GRANT = "grant",
  REVOKE = "revoke",
}

export enum TaskSetEntryAction {
  INSERT = "insert",
  UPDATE = "update",
}

export const taskSetEntryRequiredInsertArgs = [
  "callbackaddr",
  "callbackfunctionname",
  "inactive",
  "interval",
  "startat",
  "payment",
];

export const taskSetEntryUpdatableArgs = [
  "callbackaddr",
  "callbackfunctionname",
  "inactive",
  "interval",
  "startat",
  "payment",
];

// LinkPool infra nodes
export enum ChainlinkNodeId {
  LINKPOOL_ETH_GOERLI_DELTA = "linkpool_eth_goerli_delta",
}

// LinkPool infra adapters
export enum ExternalAdapterId {
  // Not Applicable
  N_A = "n/a",
  // LinkPool Managed Adapters
  ACCUWEATHER = "accuweather",
  ANCHAIN = "anchain",
  AP_SPORTS = "ap-sports",
  ARTCENTRAL = "artcentral",
  BLOCKNATIVE = "blocknative",
  CRD_NETWORK = "crd-network",
  CHARTMETRIC = "chartmetric",
  ENETPULSE = "enetpulse",
  ENETSCORES = "enetscores",
  FREELANCE_JOBS_LANCERIA = "freelance-jobs-lanceria",
  GENERIC = "generic",
  HENI = "heni",
  KYC_CIPHERTRACE = "kyc-ciphertrace",
  KYC_EVEREST = "kyc-everest",
  NFT_ANALYTICS_NFTPERP = "nft-analytics-nftperp",
  NFT_ANALYTICS_RARIFY = "nft-analytics-rarify",
  NFTBANK = "nftbank",
  PROSPECTNOW = "prospectnow",
  SMARTZIP = "smartzip",
  SOLIPAY = "solipay",
  SPORTSDATAIO_LINKPOOL = "sportsdataio-linkpool",
  T3_INDEX = "t3-index",
  TAC_INDEX = "tac-index",
  THERUNDOWN_LP = "therundown-lp",
  UPSHOT = "upshot",
  VENRAI = "venrai",
  WAVEBRIDGE = "wavebridge",
  // Chainlink Managed Adapters
  COINGECKO = "coingecko",
  DNS_QUERY = "dns-query",
  EXTERNAL_CAR_BROKER = "external-car-broker", // curioinvest
  FINAGE_OWN = "finage-own",
  THERUNDOWN = "therundown",
  TRADERMADE_OWN = "tradermade-own",
  TWELVEDATA_OWN = "twelvedata-own",
}
