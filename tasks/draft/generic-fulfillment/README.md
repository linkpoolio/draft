# GenericFulfillment & GenericFulfillmentUUPS Tasks

## Call scripts (getters)

### Get the detail

Task parameters:

| Required? |         Name          |                                        Description                                         |  Type   | Depends On |                     Options                      | Defaults to |
| :-------: | :-------------------: | :----------------------------------------------------------------------------------------: | :-----: | :--------: | :----------------------------------------------: | :---------: |
|    ✅     |        address        |               The GenericFulfillment/GenericFulfillmentUUPS contract address               | address |            |                                                  |             |
|           |         keys          |                            Logs each lot entry key (`bytes32`)                             |  Flag   |            |                                                  |   `false`   |
|           |        entries        |                               Logs each lot entry (`Entry`)                                |  Flag   |            |                                                  |   `false`   |
|           |        keepers        | Logs each Keeper info per lot, e.g. `upkeepNeeded`, `performData` (as `bytes` and decoded) |  Flag   |            |                                                  |   `false`   |
|           | lastrequesttimestamps |          Flag. Logs each lot entry `lastRequestTimestamp` (as ISO-8061 datetime)           |  Flag   |            |                                                  |   `false`   |
|    ✅     |        network        |                                  Hardhat `network` param                                   | string  |            | See `networkUserConfigs` in `/utils/networks.ts` |             |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:get-detail \
--address 0x02bA5E184De4eebDdCb865934DdecaEc6C9BFeF3 \
--network eth-kovan
```

### Check addresses roles

NB: using OpenZeppelin `AccessControl.sol` has the disadvantage of not showing publicly the addresses (keys in a map). Using an iterable mapping library would sort this out.

Task parameters:

| Required? |   Name   |                          Description                           |   Type    | Depends On |                     Options                      | Defaults to |
| :-------: | :------: | :------------------------------------------------------------: | :-------: | :--------: | :----------------------------------------------: | :---------: |
|    ✅     | address  | The GenericFulfillment/GenericFulfillmentUUPS contract address |  address  |            |                                                  |             |
|    ✅     | accounts |                     The array of accounts                      | [address] |            |                                                  |             |
|    ✅     |  roles   |   The array of roles (as human readable `AccessControlRole`)   | [string]  |            |                                                  |             |
|    ✅     | network  |                    Hardhat `network` param                     |  string   |            | See `networkUserConfigs` in `/utils/networks.ts` |             |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:have-roles \
--address 0x02bA5E184De4eebDdCb865934DdecaEc6C9BFeF3 \
--accounts '["0x797de2909991C66C66D8e730C8385bbab8D18eA6", "0x797de2909991C66C66D8e730C8385bbab8D18eA6", "0x4e269e03460719ec89bb5e3b2610c7ba67bf900d"]' \
--roles '["CONSUMER_ROLE", "DEFAULT_ADMIN_ROLE", "DEFAULT_ADMIN_ROLE"]' \
--network eth-kovan
```

## Transaction scripts (setters)

### Cancel a request

Task parameters:

| Required? |           Name            |                                      Description                                      |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :-----------------------: | :-----------------------------------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |          address          |            The GenericFulfillment/GenericFulfillmentUUPS contract address             |  address  |                        |                                                  |             |
|    ✅     |           mode            |                                  The execution mode                                   |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |         requestId         |                         The Chainlink request ID (`bytes32`)                          |  bytes32  |                        |                                                  |             |
|    ✅     | callbackfunctionsignature |               The function signature to use for the callback (`bytes4`)               |  bytes4   |                        |                                                  |             |
|    ✅     |          payment          |                      The amount of LINK (wei) paid to the oracle                      | BigNumber |                        |                                                  |             |
|    ✅     |        expiration         | The time of the expiration for the request (i.e. request block.timestamp + 5 minutes) | BigNumber |                        |                                                  |             |
|           |         overrides         |               Allows customising the tx overrides (ethers.js Overrides)               |   Flag    |                        |                                                  |   `false`   |
|           |         gaslimit          |                                   The tx `gasLimit`                                   |    int    |      --overrides       |                                                  |             |
|           |          txtype           |                                      The tx type                                      |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |         gasprice          |                         The type 0 tx `gasPrice` (in `gwei`)                          |   float   | --overrides --txtype 0 |                                                  |             |
|           |         gasmaxfee         |                       The type 0 tx `maxFeePerGas` (in `gwei`)                        |   float   | --overrides --txtype 2 |                                                  |             |
|           |      gasmaxpriority       |                      The type 0 tx `gasmaxpriority` (in `gwei`)                       |   float   | --overrides --txtype 2 |                                                  |             |
|    ✅     |          network          |                                Hardhat `network` param                                |  string   |                        | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:cancel-request \
--address 0x02bA5E184De4eebDdCb865934DdecaEc6C9BFeF3 \
--network eth-kovan \
--mode forking \
--requestid 0x794239b5b2c74a8b53870f56a1a752b8fbe7e27f61d08f72a707159d2f44239a \
--payment "100000000000000000" \
--callbackfunctionsignature 0x7c1f72a0 \
--expiration "1649351642"
```

### Deploy a GenericFulfillment

[GenericFulfillment.sol](../../../contracts/linkpool/GenericFulfillment.sol)

Optionally:

- Set it up (`--setup` flag): calls `transferOwnership()`
- Verify it (`--verify` flag).
- Customise tx overrides (`--overrides` flag).

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |  description   |                 The contract description                  |  string   |                        |                                                  |             |
|           |     admins     |   The addresses to grant with `DEFAULT_ADMIN_ROLE` role   | [address] |                        |                                                  |    `[]`     |
|           |   consumers    |     The addresses to grant with `CONSUMER_ROLE` role      | [string]  |                        |                                                  |    `[]`     |
|           |     setup      |           Configs the contract after deployment           |   Flag    |                        |                                                  |   `false`   |
|           |     owner      | Requires `--setup`. The address to transfer the ownership |           |                        |                                                  |             |
|           |     verify     |    Flag. Verifies the contract on Etherscan at the end    |           |                        |                                                  |   `false`   |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --txtype 2 |                                                  |             |
|    ✅     |    network     |                  Hardhat `network` param                  |  string   |                        | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:deploy \
--description "GenericFulfillment Test" \
--network eth-kovan \
--verify \
--overrides \
--gaslimit 10000000 \
--txtype 0 \
--gasprice 72
```

```sh
yarn hardhat draft:genericfulfillment:deploy \
--description "GenericFulfillment Test" \
--admins '["0x4e269e03460719ec89bb5e3b2610c7ba67bf900d", "0xB42d67899636F08A9019659DCBEaFaC33a27461c", "0x797de2909991C66C66D8e730C8385bbab8D18eA6"]' \
--consumers '["0xC3fc57Dffbfed58Ef2A14937c54066a03d4D46af"]' \
--setup \
--owner 0x797de2909991C66C66D8e730C8385bbab8D18eA6 \
--network eth-kovan \
--verify \
--overrides \
--gaslimit 10000000 \
--txtype 0 \
--gasprice 72
```

### Deploy a GenericFulfillmentUUPS

[GenericFulfillmentUUPS.sol](../../../contracts/linkpool/GenericFulfillmentUUPS.sol)

Optionally:

- Set it up (`--setup` flag): calls `transferOwnership()`
- Verify it (`--verify` flag).
- Customise tx overrides (`--overrides` flag).

Task parameters:

| Required? |      Name      |                                 Description                                  |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :--------------------------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      name      |                The GenericFulfillmentUUPS implementation name                |  string   |                        |                                                  |             |
|           |     admins     |            The addresses to grant with `DEFAULT_ADMIN_ROLE` role             |  adress   |                        |                                                  |    `[]`     |
|           |   consumers    |               The addresses to grant with `CONSUMER_ROLE` role               | [address] |                        |                                                  |    `[]`     |
|           |     setup      |             Configs the GenericFulfillmentUUPS after deployment              |   Flag    |                        |                                                  |   `false`   |
|           |     owner      |                    The address to transfer the ownership                     |  address  |        --setup         |                                                  |             |
|           |    upgrade     | Upgrade a UUPS proxy at a specified address to a new implementation contract |   Flag    |                        |                                                  |   `false`   |
|           |    address     |                      The ERC1967Proxy contract address                       |  address  |       --upgrade        |                                                  |             |
|           |     verify     |             Flag. Verifies the contract on Etherscan at the end              |           |                        |                                                  |   `false`   |
|           |   overrides    |          Allows customising the tx overrides (ethers.js Overrides)           |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                              The tx `gasLimit`                               |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                                 The tx type                                  |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |                     The type 0 tx `gasPrice` (in `gwei`)                     |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |                   The type 0 tx `maxFeePerGas` (in `gwei`)                   |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |                  The type 0 tx `gasmaxpriority` (in `gwei`)                  |   float   | --overrides --txtype 2 |                                                  |             |
|    ✅     |    network     |                           Hardhat `network` param                            |  string   |                        | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericfulfillmentuups:deploy \
--description "GenericFulfillmentUUPS Test" \
--network eth-kovan \
--verify
```

```sh
yarn hardhat draft:genericfulfillmentuups:deploy \
--description "GenericFulfillmentUUPS Test" \
--admins '["0x4e269e03460719ec89bb5e3b2610c7ba67bf900d", "0xB42d67899636F08A9019659DCBEaFaC33a27461c", "0x797de2909991C66C66D8e730C8385bbab8D18eA6"]' \
--consumers '["0xC3fc57Dffbfed58Ef2A14937c54066a03d4D46af"]' \
--setup \
--owner 0x797de2909991C66C66D8e730C8385bbab8D18eA6 \
--network eth-kovan \
--verify \
--overrides \
--gaslimit 10000000 \
--txtype 0 \
--gasprice 72
```

```sh
yarn hardhat draft:genericfulfillmentuups:deploy \
--name GenericFulfillmentUUPSV2 \
--address 0x8920577F937adC0a7bC71404f2491808ccAFCBdd \
--upgrade \
--network eth-kovan \
--verify
```

### Set roles (grant & revoke)

Task parameters:

| Required? |      Name      |                          Description                           |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :------------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |    address     | The GenericFulfillment/GenericFulfillmentUUPS contract address |  address  |                        |                                                  |             |
|    ✅     |      mode      |                       The execution mode                       |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |    accounts    |                     The array of accounts                      | [address] |                        |                                                  |             |
|    ✅     |      role      |   The array of roles (as human readable `AccessControlRole`)   | [string]  |                        |      `DEFAULT_ADMIN_ROLE`, `CONSUMER_ROLE`       |             |
|    ✅     |     action     |                     The action to perform                      |  string   |                        |                `grant`, `revoke`                 |             |
|           |   overrides    |   Allows customising the tx overrides (ethers.js Overrides)    |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                       The tx `gasLimit`                        |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                          The tx type                           |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |              The type 0 tx `gasPrice` (in `gwei`)              |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |            The type 0 tx `maxFeePerGas` (in `gwei`)            |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |           The type 0 tx `gasmaxpriority` (in `gwei`)           |   float   | --overrides --txtype 2 |                                                  |             |
|    ✅     |    network     |                    Hardhat `network` param                     |  string   |                        | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:set-roles \
--address 0x02bA5E184De4eebDdCb865934DdecaEc6C9BFeF3 \
--network eth-kovan \
--action grant \
--accounts '["0x9881c53788bfe04a87aad4cdc3bedca0904d1f63"]' \
--roles '["CONSUMER_ROLE"]' \
--mode forking
```

### Set stuff (e.g. description)

Task parameters:

| Required? |      Name      |                          Description                           |  Type   |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :------------------------------------------------------------: | :-----: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |    address     | The GenericFulfillment/GenericFulfillmentUUPS contract address | address |                        |                                                  |             |
|    ✅     |      mode      |                       The execution mode                       | string  |                        |                `forking`, `prod`                 |  `forking`  |
|           |  description   |                  The new `description` value                   | string  |                        |                                                  |             |
|           |     owner      |             The address to transfer the ownership              | address |                        |                                                  |             |
|           |   overrides    |   Allows customising the tx overrides (ethers.js Overrides)    |  Flag   |                        |                                                  |   `false`   |
|           |    gaslimit    |                       The tx `gasLimit`                        |   int   |      --overrides       |                                                  |             |
|           |     txtype     |                          The tx type                           |   int   |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |              The type 0 tx `gasPrice` (in `gwei`)              |  float  | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |            The type 0 tx `maxFeePerGas` (in `gwei`)            |  float  | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |           The type 0 tx `gasmaxpriority` (in `gwei`)           |  float  | --overrides --txtype 2 |                                                  |             |
|    ✅     |    network     |                    Hardhat `network` param                     | string  |                        | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:set-stuff \
--address 0x02bA5E184De4eebDdCb865934DdecaEc6C9BFeF3 \
--network eth-kovan \
--description stevetoshi sergeymoto \
--owner 0x797de2909991C66C66D8e730C8385bbab8D18eA6 \
--mode forking
```

### Verify a GenericFulillment

Alternatively use [verify contract by address](../../../../tools/README.md#verify-a-contract-by-address)

Task parameters:

| Required? |    Name     |                      Description                      |   Type    | Depends On |                     Options                      | Defaults to |
| :-------: | :---------: | :---------------------------------------------------: | :-------: | :--------: | :----------------------------------------------: | :---------: |
|    ✅     |   address   |                 The contract address                  |  address  |            |                                                  |             |
|    ✅     | description |               The contract description                |  string   |            |                                                  |             |
|    ✅     |   admins    | The addresses to grant with `DEFAULT_ADMIN_ROLE` role | [address] |            |                                                  |    `[]`     |
|    ✅     |  consumers  |   The addresses to grant with `CONSUMER_ROLE` role    | [string]  |            |                                                  |    `[]`     |
|    ✅     |   network   |                Hardhat `network` param                |  string   |            | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericfulfillment:verify \
--address 0xC3fc57Dffbfed58Ef2A14937c54066a03d4D46af \
--description "GenericFulfillment Test" \
--admins '["0x4e269e03460719ec89bb5e3b2610c7ba67bf900d", "0xB42d67899636F08A9019659DCBEaFaC33a27461c", "0x797de2909991C66C66D8e730C8385bbab8D18eA6"]' \
--consumers '["0xC3fc57Dffbfed58Ef2A14937c54066a03d4D46af"]' \
--network eth-kovan
```

### Verify a GenericFulfillmentUUPS

The flag `--verify` just verifies the implementation contract. The `ERC1967Proxy` proxy contract is automatically verified by Etherscan. However, it is required to let Etherscan know that it is a proxy:

1. Etherscan Contract -> Code -> More Options -> Is this a proxy? -> Verify -> Save
2. Etherscan Contract -> Code ->Read as Proxy
