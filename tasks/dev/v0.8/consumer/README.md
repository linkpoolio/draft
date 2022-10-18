# Standard Consumer Tasks

## Transaction scripts

#### Deploy a Standard Consumer

[Contracts](../../../../contracts/dev/v0.8/)

**Requirements**: first compile the contracts, then generate the Typechain interfaces. Any contract change requires to repeat these steps.

```sh
$ yarn compile
$ yarn typechain
```

## Standard Consumer Contract

**BE AWARE**: deploy a consumer contract based on [TemplateConsumer.sol](../../../../contracts/TemplateConsumer.sol) whose constructor requires `[<address LINK>,<address oracle>]`.

Optionally:

- Fund it with LINK (`--funds` param).
- Verify it (`--verify` flag).
- Customise tx overrides (`--overrides` flag).

Task parameters:

| Required? |      Name      |                          Description                           |   Type    |      Depends On      |                     Options                      |               Defaults to               |
| :-------: | :------------: | :------------------------------------------------------------: | :-------: | :------------------: | :----------------------------------------------: | :-------------------------------------: |
|    ✅     |      name      |          The consumer contract name (case sensitive)           |  string   |                      |                                                  |                                         |
|           |    operator    |                 The Operator contract address                  |  address  |                      |                                                  | `process.env.OPERATOR_CONTRACT_ADDRESS` |
|           |     funds      | The amount of LINK (wei) to fund the contract after deployment | BigNumber |                      |                                                  |                                         |
|           |     verify     |         Verifies the contract on Etherscan at the end          |   Flag    |                      |                                                  |                 `false`                 |
|           |   overrides    |   Allows customising the tx overrides (ethers.js Overrides)    |   Flag    |                      |                                                  |                 `false`                 |
|           |    gaslimit    |                       The tx `gasLimit`                        |    int    |     --overrides      |                                                  |                                         |
|           |     txtype     |                          The tx type                           |    int    |     --overrides      |           `0` (legacy), `2` (EIP-1559)           |                                         |
|           |    gasprice    |              The type 0 tx `gasPrice` (in `gwei`)              |   float   | --overrides --type 0 |                                                  |                                         |
|           |   gasmaxfee    |            The type 0 tx `maxFeePerGas` (in `gwei`)            |   float   | --overrides --type 2 |                                                  |                                         |
|           | gasmaxpriority |           The type 0 tx `gasmaxpriority` (in `gwei`)           |   float   | --overrides --type 2 |                                                  |                                         |
|    ✅     |    network     |                    Hardhat `network` param                     |  string   |                      | See `networkUserConfigs` in `/utils/networks.ts` |                `hardhat`                |

Example calls:

```sh
yarn hardhat consumer:v0.8:deploy \
--name AccuweatherConsumer \
--operator 0xbAe0E4d5A6BBE43e98131494b4C30c4DFf4E97B7 \
--verify \
--network matic-mumbai
```

```sh
yarn hardhat consumer:v0.8:deploy \
--name AccuweatherConsumer \
--operator 0xbAe0E4d5A6BBE43e98131494b4C30c4DFf4E97B7 \
--funds 2000000000000000000 \
--verify \
--network matic-mumbai
```

```sh
yarn hardhat consumer:v0.8:deploy \
--name AccuweatherConsumer \
--operator 0xbAe0E4d5A6BBE43e98131494b4C30c4DFf4E97B7 \
--funds 2000000000000000000 \
--verify \
--network matic-mumbai \
--overrides \
--gaslimit 10000000 \
--txtype 0 \
--gasprice 3
```

```sh
yarn hardhat consumer:v0.8:deploy \
--name AccuweatherConsumer \
--oracle 0xbAe0E4d5A6BBE43e98131494b4C30c4DFf4E97B7 \
--funds 2000000000000000000 \
--verify \
--network matic-mumbai \
--overrides \
--gaslimit 10000000 \
--txtype 2 \
--gasmaxfee 145 \
--gasmaxpriority 2
```

## Verification

### Verify a Standard Consumer

Task parameters:

| Required? |  Name   |             Description              |  Type   | Depends On |                     Options                      |               Defaults to               |
| :-------: | :-----: | :----------------------------------: | :-----: | :--------: | :----------------------------------------------: | :-------------------------------------: |
|    ✅     | address |         The contract address         | address |            |                                                  |                                         |
|           | oracle  | The Oracle/Operator contract address | address |            |                                                  | Public key of `process.env.PRIVATE_KEY` |
|    ✅     | network |       Hardhat `network` param        | string  |            | See `networkUserConfigs` in `/utils/networks.ts` |                `hardhat`                |

Example calls:

```sh
yarn hardhat consumer:v0.8:verify \
--address 0x64010872daA06C317B8d3a7d7E9E9789CC918313 \
--oracle 0x75A0003E8a8ba51CB42905A976883338E7017B42 \
--network matic-mumbai
```
