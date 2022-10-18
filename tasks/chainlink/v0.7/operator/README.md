# Operator.sol 1.0.0 Tasks

## Transaction scripts

### Collect & decode fulfilled request

Collect and log fulfilled requests decoding the `OracleRequest` event.

Task parameters:

| Required? |     Name     |                           Description                           |   Type    | Depends On |                     Options                      | Defaults to |
| :-------: | :----------: | :-------------------------------------------------------------: | :-------: | :--------: | :----------------------------------------------: | :---------: |
|    ✅     |   address    |   The Operator contract address (Oracle is supported as well)   |  address  |            |                                                  |             |
|           |     from     |          The starting block number from where to query          | bignumber |            |                                                  |             |
|           |      to      |             The ending block number where to query              | bignumber |            |                                                  |             |
|           |     hash     |                     The block hash to query                     |  bytes32  |            |                                                  |             |
|           | flrequestids |               The `requestId` topics to filter by               | [bytes32] |            |                                                  |             |
|           | decodersigs  | The `bytes4(keccack256(<decoder name>))` of the decoders to use | [bytes4]  |            |                                                  |             |
|           | decodernames |                The names of the decoders to use                 | [string]  |            |                                                  |             |
|    ✅     |   network    |                     Hardhat `network` param                     |  string   |            | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat operator:v0.7:collect \
--address 0x8611469e0ad4789553b3f2ec1478ce9237baff67 \
--from "25618972" \
--flrequestids '["0x021f5d48ede75bbdb68407a044a121288f222d87e13be99b5cba2a02713b788c"]' \
--decodernames '["therundownLpScheduleGamesCreated_v2_1(bytes32,bytes[])"]' \
--network opt-mainnet
```

```sh
yarn hardhat operator:v0.7:collect \
--address 0x8611469e0ad4789553b3f2ec1478ce9237baff67 \
--from "25618972" \
--flrequestids '["0x021f5d48ede75bbdb68407a044a121288f222d87e13be99b5cba2a02713b788c"]' \
--decodersigs '["0x4ec20e9c"]' \
--network opt-mainnet
```

### Deploy an Operator 1.0.0

[Operator.sol](../../../../contracts/chainlink/v0.7/Operator.sol)

Optionally:

- Set it up (`--setup` flag): calls `setAuthorizedSenders()` -> calls `transferOwnership()`
- Verify it (`--verify` flag).
- Customise tx overrides (`--overrides` flag).

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|           |     setup      |           Configs the contract after deployment           |   Flag    |                        |                                                  |   `false`   |
|           |     owner      |           The address to transfer the ownership           |  address  |        --setup         |                                                  |             |
|           |    senders     |             The authorized senders' addresses             | [address] |        --setup         |                                                  |             |
|           |     verify     |       Verifies the contract on Etherscan at the end       |   Flag    |                        |                                                  |   `false`   |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --txtype 2 |                                                  |             |
|    ✅     |    network     |                  Hardhat `network` param                  |  string   |                        | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat operator:v0.7:deploy \
--setup \
--owner 0x65D78dC918F9905a75c54525Eb738cD431a8e3a2 \
--senders '["0x6825d0EcEb04954e568484A9cC9865a7C51b5718", "0x4811eeDE2cA80Be1d13096beA7Fc947aa037510f"]' \
--verify \
--network eth-kovan
```

```sh
yarn hardhat operator:v0.7:deploy \
--setup \
--owner 0x65D78dC918F9905a75c54525Eb738cD431a8e3a2 \
--senders '["0x6825d0EcEb04954e568484A9cC9865a7C51b5718", "0x4811eeDE2cA80Be1d13096beA7Fc947aa037510f"]' \
--verify \
--network eth-kovan \
--overrides \
--gaslimit 10000000 \
--txtype 0 \
--gasprice 72
```

```sh
yarn hardhat operator:v0.7:deploy \
--setup \
--owner 0x65D78dC918F9905a75c54525Eb738cD431a8e3a2 \
--senders '["0x6825d0EcEb04954e568484A9cC9865a7C51b5718", "0x4811eeDE2cA80Be1d13096beA7Fc947aa037510f"]' \
--verify \
--network eth-kovan \
--overrides \
--gaslimit 10000000 \
--txtype 2 \
--gasmaxfee 145 \
--gasmaxpriority 2
```

## Verification

### Verify an Operator 1.0.0

Task parameters:

| Required? |   Name   |       Description       |  Type   | Depends On |                     Options                      |                            Defaults to                            |
| :-------: | :------: | :---------------------: | :-----: | :--------: | :----------------------------------------------: | :---------------------------------------------------------------: |
|    ✅     | address  |  The contract address   | address |            |                                                  |                                                                   |
|           | deployer |  The deployer address   | address |            |                                                  | Public key of `process.env.PRIVATE_KEY` or `process.env.MNEMONIC` |
|    ✅     | network  | Hardhat `network` param | string  |            | See `networkUserConfigs` in `/utils/networks.ts` |                             `hardhat`                             |

Example calls:

```sh
yarn hardhat operator:v0.7:verify \
--address 0x64010872daA06C317B8d3a7d7E9E9789CC918313 \
--deployer 0x75A0003E8a8ba51CB42905A976883338E7017B42 \
--network matic-mumbai
```
