import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { ethers } from "ethers";

import { GenericFulfillment } from "../../../src/types";
import { Overrides } from "../../../utils/types";

export interface TaskSetData {
  genericFulfillment: GenericFulfillment;
  netSigner: ethers.Wallet | SignerWithAddress;
  overrides: Overrides;
}
