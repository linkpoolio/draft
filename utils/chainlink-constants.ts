import { BigNumber } from "ethers";

import { ChainId } from "./constants";

export const LINK_TOTAL_SUPPLY = BigNumber.from("10").pow("27");

//NB: don't make it readonly to allow dryrun deploys on the Hardhat network
export const chainIdLink: Map<ChainId, string> = new Map([
  [ChainId.ETH_MAINNET, "0x514910771AF9Ca656af840dff83E8264EcF986CA"],
  [ChainId.ETH_RINKEBY, "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"],
  [ChainId.ETH_GOERLI, "0x326c977e6efc84e512bb9c30f76e30c160ed06fb"],
  [ChainId.OPT_MAINNET, "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6"],
  [ChainId.RSK_MAINNET, "0x14AdaE34beF7ca957Ce2dDe5ADD97ea050123827"],
  [ChainId.ETH_KOVAN, "0xa36085F69e2889c224210F603D836748e7dC0088"],
  [ChainId.BSC_MAINNET, "0x404460C6A5EdE2D891e8297795264fDe62ADBB75"],
  [ChainId.OPT_KOVAN, "0x4911b761993b9c8c0d14Ba2d86902AF6B0074F5B"],
  [ChainId.BSC_TESTNET, "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06"],
  [ChainId.XDAI_MAINNET, "0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2"],
  [ChainId.HECO_MAINNET, "0x9e004545c59D359F6B7BFB06a26390b087717b42"],
  [ChainId.MATIC_MAINNET, "0xb0897686c545045aFc77CF20eC7A532E3120E0F1"],
  [ChainId.FTM_MAINNET, "0x6F43FF82CCA38001B6699a8AC47A2d0E66939407"],
  [ChainId.OPT_GOERLI, "0xdc2CC710e42857672E7907CF474a69B63B93089f"],
  [ChainId.KLAYTN_BAOBAB, "0x04c5046A1f4E3fFf094c26dFCAA75eF293932f18"],
  [ChainId.METIS_MAINNET, "0x79892E8A3Aea66C8F6893fa49eC6208ef07EC046"],
  [ChainId.MOONBEAM_MAINNET, "0x012414A392F9FA442a3109f1320c439C45518aC3"],
  [ChainId.MOONBEAM_MOONRIVER, "0x8b12Ac23BFe11cAb03a634C1F117D64a7f2cFD3e"],
  [ChainId.FTM_TESTNET, "0xfaFedb041c0DD4fA2Dc0d87a6B0979Ee6FA7af5F"],
  [ChainId.ARB_MAINNET, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"],
  [ChainId.AVAX_FUJI, "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"],
  [ChainId.AVAX_MAINNET, "0x5947BB275c521040051D82396192181b413227A3"],
  [ChainId.MATIC_MUMBAI, "0x326C977E6efc84E512bB9C30f76E30c160eD06FB"],
  [ChainId.ARB_RINKEBY, "0x615fBe6372676474d9e6933d310469c9b68e9726"],
  [ChainId.ARB_GOERLI, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"],
  [ChainId.ONE_MAINNET, "0x218532a12a389a4a92fC0C5Fb22901D1c19198aA"],
  [ChainId.ONE_TESTNET, "0x8b12Ac23BFe11cAb03a634C1F117D64a7f2cFD3e"],
]);

// LinkPool - GenericConsumer
export enum RequestParamType {
  // From Chainlink.sol
  BUFFER = "buffer",
  BYTES_RAW = "bytes_raw",
  INT = "int",
  STRING = "string",
  STRING_ARRAY = "string_array",
  UINT = "uint",
  // LinkPool custom ones
  ADDRESS = "address", // i.e. req.addBytes("address", abi.encode(_address));
  ADDRESS_ARRAY = "address_array", // i.e. req.addBytes("addresses", abi.encode(_addresses));
  BYTES = "bytes",
  BYTES_PACKED = "bytes_packed", // i.e. req.addBytes("address", abi.encodePacked(_address));
  INT_ARRAY = "int_array",
  UINT_ARRAY = "uint_array",
}

export const keepersCheckGasLimit: ReadonlyMap<ChainId, BigNumber> = new Map([
  [ChainId.ETH_MAINNET, BigNumber.from("6500000")],
  [ChainId.ETH_KOVAN, BigNumber.from("6500000")],
  [ChainId.BSC_MAINNET, BigNumber.from("6500000")],
  [ChainId.BSC_TESTNET, BigNumber.from("6500000")],
  [ChainId.HARDHAT, BigNumber.from("6500000")],
  [ChainId.MATIC_MAINNET, BigNumber.from("6500000")],
  [ChainId.MATIC_MUMBAI, BigNumber.from("6500000")],
]);

export const keepersPerformGasLimit: ReadonlyMap<ChainId, BigNumber> = new Map([
  [ChainId.ETH_MAINNET, BigNumber.from("5000000")],
  [ChainId.ETH_KOVAN, BigNumber.from("5000000")],
  [ChainId.BSC_MAINNET, BigNumber.from("5000000")],
  [ChainId.BSC_TESTNET, BigNumber.from("5000000")],
  [ChainId.HARDHAT, BigNumber.from("5000000")],
  [ChainId.MATIC_MAINNET, BigNumber.from("5000000")],
  [ChainId.MATIC_MUMBAI, BigNumber.from("5000000")],
]);
