import { convertFunctionNametoSignature } from "../../../../utils/abi";
import { callbackFunctionNameToDecoder as accuWeatherCallbackFunctionNameToDecoder } from "./accuweather";
import { callbackFunctionNameToDecoder as anchainCallbackFunctionNameToDecoder } from "./anchain";
import { callbackFunctionNameToDecoder as apSportsCallbackFunctionNameToDecoder } from "./ap-sports";
import { callbackFunctionNameToDecoder as artcentralCallbackFunctionNameToDecoder } from "./artcentral";
import { callbackFunctionNameToDecoder as blocknativeCallbackFunctionNameToDecoder } from "./blocknative";
import { callbackFunctionNameToDecoder as chartmetricCallbackFunctionNameToDecoder } from "./chartmetric";
import { callbackFunctionNameToDecoder as crdNetworkCallbackFunctionNameToDecoder } from "./crd-network";
import { callbackFunctionNameToDecoder as dnsQueryCallbackFunctionNameToDecoder } from "./dns-query";
import { callbackFunctionNameToDecoder as enetpulseCallbackFunctionNameToDecoder } from "./enetpulse";
import { callbackFunctionNameToDecoder as enetscoresCallbackFunctionNameToDecoder } from "./enetscores";
import { callbackFunctionNameToDecoder as finageOwnCallbackFunctionNameToDecoder } from "./finage-own";
import { callbackFunctionNameToDecoder as freelanceJobsLanceriaCallbackFunctionNameToDecoder } from "./freelance-jobs-lanceria";
import { callbackFunctionNameToDecoder as genericFulfillmentCallbackFunctionNameToDecoder } from "./generic-fulfillment";
import { callbackFunctionNameToDecoder as heniCallbackFunctionNameToDecoder } from "./heni";
import { callbackFunctionNameToDecoder as kycCiphertraceCallbackFunctionNameToDecoder } from "./kyc-ciphertrace";
import { callbackFunctionNameToDecoder as kycEverestCallbackFunctionNameToDecoder } from "./kyc-everest";
import { callbackFunctionNameToDecoder as nftAnalyticsNftperpCallbackFunctionNameToDecoder } from "./nft-analytics-nftperp";
import { callbackFunctionNameToDecoder as nftAnalyticsRarifyCallbackFunctionNameToDecoder } from "./nft-analytics-rarify";
import { callbackFunctionNameToDecoder as nftbankCallbackFunctionNameToDecoder } from "./nftbank";
import { callbackFunctionNameToDecoder as prospectnowCallbackFunctionNameToDecoder } from "./prospectnow";
import { callbackFunctionNameToDecoder as smartzipCallbackFunctionNameToDecoder } from "./smartzip";
import { callbackFunctionNameToDecoder as sportsdataioLinkpoolCallbackFunctionNameToDecoder } from "./sportsdataio-linkpool";
import { callbackFunctionNameToDecoder as tacIndexCallbackFunctionNameToDecoder } from "./tac-index";
import { callbackFunctionNameToDecoder as therundownLpCallbackFunctionNameToDecoder } from "./therundown-lp";
import { callbackFunctionNameToDecoder as tradermadeOwnCallbackFunctionNameToDecoder } from "./tradermade-own";
import { callbackFunctionNameToDecoder as twelvedataOwnCallbackFunctionNameToDecoder } from "./twelvedata-own";
import type { Decoder, DecoderData } from "./types";
import { callbackFunctionNameToDecoder as upshotCallbackFunctionNameToDecoder } from "./upshot";
import { callbackFunctionNameToDecoder as venraiCallbackFunctionNameToDecoder } from "./venrai";
import { callbackFunctionNameToDecoder as wavebridgeCallbackFunctionNameToDecoder } from "./wavebridge";

export const callbackFunctionNameToDecoder: ReadonlyMap<string, Decoder> = new Map([
  ...accuWeatherCallbackFunctionNameToDecoder,
  ...anchainCallbackFunctionNameToDecoder,
  ...apSportsCallbackFunctionNameToDecoder,
  ...artcentralCallbackFunctionNameToDecoder,
  ...blocknativeCallbackFunctionNameToDecoder,
  ...chartmetricCallbackFunctionNameToDecoder,
  ...crdNetworkCallbackFunctionNameToDecoder,
  ...dnsQueryCallbackFunctionNameToDecoder,
  ...enetpulseCallbackFunctionNameToDecoder,
  ...enetscoresCallbackFunctionNameToDecoder,
  ...finageOwnCallbackFunctionNameToDecoder,
  ...freelanceJobsLanceriaCallbackFunctionNameToDecoder,
  ...genericFulfillmentCallbackFunctionNameToDecoder,
  ...heniCallbackFunctionNameToDecoder,
  ...kycCiphertraceCallbackFunctionNameToDecoder,
  ...kycEverestCallbackFunctionNameToDecoder,
  ...nftAnalyticsNftperpCallbackFunctionNameToDecoder,
  ...nftAnalyticsRarifyCallbackFunctionNameToDecoder,
  ...nftbankCallbackFunctionNameToDecoder,
  ...prospectnowCallbackFunctionNameToDecoder,
  ...smartzipCallbackFunctionNameToDecoder,
  ...sportsdataioLinkpoolCallbackFunctionNameToDecoder,
  ...tacIndexCallbackFunctionNameToDecoder,
  ...therundownLpCallbackFunctionNameToDecoder,
  ...tradermadeOwnCallbackFunctionNameToDecoder,
  ...twelvedataOwnCallbackFunctionNameToDecoder,
  ...upshotCallbackFunctionNameToDecoder,
  ...venraiCallbackFunctionNameToDecoder,
  ...wavebridgeCallbackFunctionNameToDecoder,
]);

// NB: the Map key is the bytes4(keccak256(callbackFunctionName))
export const callbackFunctionIdToDecoderData: ReadonlyMap<string, DecoderData> = new Map(
  Array.from(callbackFunctionNameToDecoder).map(([callbackFunctionName, decoder]) => {
    const callbackFunctionId = convertFunctionNametoSignature(callbackFunctionName);
    const decoderData = {
      callbackFunctionName, // NB: extended for logging purposes
      decoder,
    };
    return [callbackFunctionId, decoderData];
  }),
);
