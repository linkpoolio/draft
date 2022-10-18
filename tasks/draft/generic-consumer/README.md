# GenericConsumer Tasks

## Call scripts (getters)

### Collect & decode fulfilled request

Collect and log fulfilled requests decoding the `ChainlinkFulfilled` event.

Task parameters:

| Required? |       Name       |                                              Description                                               |   Type    | Depends On |                     Options                      | Defaults to |
| :-------: | :--------------: | :----------------------------------------------------------------------------------------------------: | :-------: | :--------: | :----------------------------------------------: | :---------: |
|    ✅     |     address      |                                  The GenericConsumer contract address                                  |  address  |            |                                                  |             |
|           |       from       |                             The starting block number from where to query                              | bignumber |            |                                                  |             |
|           |        to        |                                 The ending block number where to query                                 | bignumber |            |                                                  |             |
|           |       hash       |                                        The block hash to query                                         |  bytes32  |            |                                                  |             |
|           |   flrequestids   |                                  The `requestId` topics to filter by                                   | [bytes32] |            |                                                  |             |
|           | flcallbackaddrs  |                                 The `callbackAddr` topics to filter by                                 | [address] |            |                                                  |             |
|           | flcallbackfsigs  |                          The `callbackFunctionSignature` topics to filter by                           | [bytes32] |            |                                                  |             |
|           | flcallbackfnames | The `callbackFunctionName` topics to filter by (each item is converted to `callbackFunctionSignature`) | [string]  |            |                                                  |             |
|    ✅     |     network      |                                        Hardhat `network` param                                         |  string   |            | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericconsumer:collect \
--address 0x563C4ca9fbdD517D5d218f05D0857f9d824aCB69 \
--from "7421451" \
--network eth-goerli
```

```sh
yarn hardhat draft:genericconsumer:collect \
--address 0x563C4ca9fbdD517D5d218f05D0857f9d824aCB69 \
--from "7421451" \
--flrequestids '["0x70a3c7c53709a0adf69a0945412e28e2d70b6abac22f0d29f7ed774192ea7474", "0xc262487c8b2676ae8e682d304bed4c62cdb303af75a2842a7831272713ab8b33"]' \
--flcallbackfsigs '["0xf778808c"]' \
--network eth-goerli
```

```sh
yarn hardhat draft:genericconsumer:collect \
--address 0x563C4ca9fbdD517D5d218f05D0857f9d824aCB69 \
--from "7421451" \
--flrequestids '["0x70a3c7c53709a0adf69a0945412e28e2d70b6abac22f0d29f7ed774192ea7474", "0xc262487c8b2676ae8e682d304bed4c62cdb303af75a2842a7831272713ab8b33"]' \
--flcallbackfnames '["upshotStatisticsTimestampFloorprice(bytes32,bytes32)"]' \
--network eth-goerli
```

### Convert a single jobspec entry from JSON entries file

Task parameters:

| Required? |   Name   |                              Description                               |  Type  | Depends On | Options | Defaults to |
| :-------: | :------: | :--------------------------------------------------------------------: | :----: | :--------: | :-----: | :---------: |
|    ✅     | filename | The entries filename (without `.json` extension) in the entries folder | string |            |         |             |
|    ✅     |  jobid   |                   The entry jobId (TOML spec DB ID)                    | number |            |         |             |
|    ✅     | jobcase  |                           The entry jobCase                            | number |            |         |             |
|           |   cbor   |     **EXPERIMENTAL**. Generates the buffer using the CBOR library      |  Flag  |            |         |   `false`   |

Example calls:

```sh
yarn hardhat draft:genericconsumer:convert-file-entry \
--filename linkpool-eth-goerli-delta \
--jobid 108 \
--jobcase 0
```

### Log the storage detail

Task parameters:

| Required? |         Name          |                                        Description                                         |  Type   | Depends On |                     Options                      | Defaults to |
| :-------: | :-------------------: | :----------------------------------------------------------------------------------------: | :-----: | :--------: | :----------------------------------------------: | :---------: |
|    ✅     |        address        |                            The GenericConsumer contract address                            | address |            |                                                  |             |
|           |         keys          |                           Logs each lot entry key (as `bytes32`)                           |  Flag   |            |                                                  |   `false`   |
|           |        entries        |                              Logs each lot entry (as `Entry`)                              |  Flag   |            |                                                  |   `false`   |
|           |        keepers        | Logs each Keeper info per lot, e.g. `upkeepNeeded`, `performData` (as `bytes` and decoded) |  Flag   |            |                                                  |   `false`   |
|           | lastrequesttimestamps |             Logs each lot entry `lastRequestTimestamp` (as ISO-8061 datetime)              |  Flag   |            |                                                  |   `false`   |
|    ✅     |        network        |                                  Hardhat `network` param                                   | string  |            | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat draft:genericconsumer:log \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--keys \
--entries \
--lastrequesttimestamps \
--keepers \
--network eth-goerli
```

## Transaction scripts (setters)

### Deploy a GenericConsumer

[GenericConsumer.sol](../../../contracts/linkpool/v0.8/GenericConsumer.sol)

Optionally:

- Set it up (`--setup` flag): calls `transferOwnership()`
- Fund it with LINK (`--funds` param).
- Verify it (`--verify` flag).
- Customise tx overrides deployment (`--overrides` flag).

Task parameters:

| Required? |      Name      |                          Description                          |   Type    |       Depends On       |                     Options                      |               Defaults to                |
| :-------: | :------------: | :-----------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :--------------------------------------: |
|    ✅     |  description   |                   The contract description                    |  string   |                        |                                                  |                                          |
|           |  mingaslimit   | The minimum gas limit allowed to request on `performUpkeep()` | BigNumber |                        |                                                  | `MIN_GAS_LIMIT_PERFORM_UPKEEP` (300_000) |
|           |     setup      |             Configs the contract after deployment             |   Flag    |                        |                                                  |                 `false`                  |
|           |     owner      |   Requires `--setup`. The address to transfer the ownership   |  address  |        --setup         |                                                  |                                          |
|           |     verify     |         Verifies the contract on Etherscan at the end         |   Flag    |                        |                                                  |                 `false`                  |
|           |   overrides    |   Allows customising the tx overrides (ethers.js Overrides)   |   Flag    |                        |                                                  |                 `false`                  |
|           |    gaslimit    |                       The tx `gasLimit`                       |    int    |      --overrides       |                                                  |                                          |
|           |     txtype     |                          The tx type                          |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |                                          |
|           |    gasprice    |             The type 0 tx `gasPrice` (in `gwei`)              |   float   | --overrides --txtype 0 |                                                  |                                          |
|           |   gasmaxfee    |           The type 0 tx `maxFeePerGas` (in `gwei`)            |   float   | --overrides --txtype 2 |                                                  |                                          |
|           | gasmaxpriority |          The type 0 tx `gasmaxpriority` (in `gwei`)           |   float   | --overrides --txtype 2 |                                                  |                                          |
|    ✅     |    network     |                    Hardhat `network` param                    |  string   |                        | See `networkUserConfigs` in `/utils/networks.ts` |                `hardhat`                 |

Example calls:

```sh
yarn hardhat draft:genericconsumer:deploy \
--description "GenericConsumer Test" \
--network eth-goerli \
--verify
```

```sh
yarn hardhat draft:genericconsumer:deploy \
--description "GenericConsumer Test" \
--mingaslimit "300000" \
--setup \
--owner 0x65D78dC918F9905a75c54525Eb738cD431a8e3a2 \
--network eth-goerli \
--verify \
--overrides \
--gaslimit 10000000 \
--txtype 0 \
--gasprice 72
```

### Fund a consumer address with LINK

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      net       |                     The network name                      |  network  |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |    address     |           The GenericConsumer contract address            |  address  |                        |                                                  |             |
|    ✅     |      mode      |                    The execution mode                     |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|           |     fundgc     | Funds the contract balance (consumer is GenericConsumer)  |   Flag    |                        |                                                  |   `false`   |
|           |    consumer    |       The address that receives LINK in its balance       |  address  |                        |                                                  |             |
|    ✅     |     amount     |                 The amount of LINK (wei)                  | BigNumber |                        |                                                  |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:fund \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--fundgc \
--amount "3000000000000000000" \
--net eth-goerli \
--mode prod
```

```sh
yarn hardhat draft:genericconsumer:fund \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--consumer 0x65D78dC918F9905a75c54525Eb738cD431a8e3a2 \
--amount "3000000000000000000" \
--net eth-goerli \
--mode prod
```

### Import (CUD) entries from a JSON entries file

Task parameters:

| Required? |      Name      |                              Description                               |  Type   |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :--------------------------------------------------------------------: | :-----: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      net       |                            The network name                            | network |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |    address     |                  The GenericConsumer contract address                  | address |                        |                                                  |             |
|    ✅     |    filename    | The entries filename (without `.json` extension) in the entries folder | string  |                        |                                                  |             |
|    ✅     |      lot       |                      The entries lot where to CUD                      |   int   |                        |                                                  |             |
|    ✅     |      mode      |                           The execution mode                           | string  |                        |           `dryrun`, `forking`, `prod`            |  `dryrun`   |
|           |    nobatch     |                       Disables the batch import                        |  Flag   |                        |                                                  |   `false`   |
|           |   batchsize    |                 Number of entries per CUD transaction                  |   int   |                        |                                                  |    `50`     |
|           |   overrides    |       Allows customising the tx overrides (ethers.js Overrides)        |  Flag   |                        |                                                  |   `false`   |
|           |    gaslimit    |                           The tx `gasLimit`                            |   int   |      --overrides       |                                                  |             |
|           |     txtype     |                              The tx type                               |   int   |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |                  The type 0 tx `gasPrice` (in `gwei`)                  |  float  | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |                The type 0 tx `maxFeePerGas` (in `gwei`)                |  float  | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |               The type 0 tx `gasmaxpriority` (in `gwei`)               |  float  | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:import-file \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--filename eth-goerli-demo-linkpool \
--lot "1" \
--net eth-goerli \
--mode dryrun
```

```sh
yarn hardhat draft:genericconsumer:import-file \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--filename eth-goerli-demo-linkpool \
--lot "1" \
--batchsize "75" \
--net eth-goerli \
--mode prod
```

### Pause or unpause

Task parameters:

| Required? |      Name      |                        Description                        |  Type   |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-----: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      net       |                     The network name                      | network |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |    address     |           The GenericConsumer contract address            | address |                        |                                                  |             |
|    ✅     |      mode      |                    The execution mode                     | string  |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |     action     |                   The action to perform                   | string  |                        |                `pause`, `unpause`                |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |  Flag   |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |   int   |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |   int   |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |  float  | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |  float  | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |  float  | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:set-pause \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--unpause \
--mode forking
```

### Set stuff (e.g. description, transfer ownership, allow upkeeps on a lot, etc.)

Task parameters:

| Required? |      Name       |                          Description                          |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :-------------: | :-----------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |       net       |                       The network name                        |  network  |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |     address     |             The GenericConsumer contract address              |  adress   |                        |                                                  |             |
|    ✅     |      mode       |                      The execution mode                       |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|           |   description   |                  The new `description` value                  |  string   |                        |                                                  |             |
|           |      owner      |             The address to transfer the ownership             |  address  |                        |                                                  |             |
|           |   mingaslimit   | The minimum gas limit allowed to request on `performUpkeep()` | BigNumber |                        |                                                  |             |
|           |  latestroundid  |                 The new `latestRoundId` value                 | BigNumber |                        |                                                  |             |
|           |       lot       |                        The entries lot                        | BigNumber |                        |                                                  |             |
|           | isupkeepallowed |         Whether Keepers upkeep is allowed on the lot          |  boolean  |          lot           |                                                  |             |
|           |    overrides    |   Allows customising the tx overrides (ethers.js Overrides)   |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit     |                       The tx `gasLimit`                       |    int    |      --overrides       |                                                  |             |
|           |     txtype      |                          The tx type                          |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice     |             The type 0 tx `gasPrice` (in `gwei`)              |   float   | --overrides --txtype 0 |                                                  |             |
|           |    gasmaxfee    |           The type 0 tx `maxFeePerGas` (in `gwei`)            |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority  |          The type 0 tx `gasmaxpriority` (in `gwei`)           |   float   | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:set-stuff \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--description AssBlaster \
--latestroundid "777" \
--owner 0x65D78dC918F9905a75c54525Eb738cD431a8e3a2 \
--lot "1" \
--isupkeepallowed true \
--mingaslimit "350000" \
--mode forking
```

### Set (insert or update) an Entry via task arguments

Task parameters:

| Required? |         Name         |                                          Description                                           |    Type    |       Depends On       |           Options            | Defaults to |
| :-------: | :------------------: | :--------------------------------------------------------------------------------------------: | :--------: | :--------------------: | :--------------------------: | :---------: |
|    ✅     |         net          |                                        The network name                                        |  network   |                        |                              |             |
|    ✅     |       address        |                              The GenericConsumer contract address                              |  address   |                        |                              |             |
|    ✅     |         mode         |                                       The execution mode                                       |   string   |                        |      `forking`, `prod`       |  `forking`  |
|    ✅     |        action        |                                     The action to perform                                      |   string   |                        |      `insert`, `update`      |             |
|    ✅     |         lot          |                                        The entries lot                                         | BigNumber  |                        |                              |             |
|    ✅     |    externaljobid     |           The Job Specification ID that the request will be created for (as UUIDv4)            |   uuidv4   |                        |                              |             |
|    ✅     |      oracleaddr      |                                  The oracle contract address                                   |  address   |                        |                              |             |
|    ✅     |    requestparams     |                         The the Chainlink request parameters (as JSON)                         | JSON array |                        |                              |             |
|    ✅     |     requesttype      |                               The kind of Chainlink request sent                               |    int     |                        | `0` (Oracle), `1` (Operator) |             |
|           |       inactive       |                             Whether the spec entry is requestable                              |  boolean   |                        |                              |             |
|           | lastrequesttimestamp |             A point in time of the last request (UNIX Epoch in seconds as string)              | BigNumber  |                        |                              |             |
|           |       payment        |                          The amount of LINK (wei) paid to the oracle                           | BigNumber  |                        |                              |             |
|           |     callbackaddr     |                             The address to operate the callback on                             |  address   |                        |                              |             |
|           | callbackfunctionname |                           The function name to use for the callback                            |   string   |                        |                              |             |
|           |       startat        | A point in time after which the jobspec entry is requestable (UNIX Epoch in seconds as string) | BigNumber  |                        |                              |             |
|           |       interval       |         The minimum amount of time between requests (UNIX Epoch in seconds as string)          | BigNumber  |                        |                              |             |
|           |      overrides       |                   Allows customising the tx overrides (ethers.js Overrides)                    |    Flag    |                        |                              |   `false`   |
|           |       gaslimit       |                                       The tx `gasLimit`                                        |    int     |      --overrides       |                              |             |
|           |        txtype        |                                          The tx type                                           |    int     |      --overrides       | `0` (legacy), `2` (EIP-1559) |             |
|           |       gasprice       |                              The type 0 tx `gasPrice` (in `gwei`)                              |   float    | --overrides --txtype 0 |                              |             |
|           |      gasmaxfee       |                            The type 0 tx `maxFeePerGas` (in `gwei`)                            |   float    | --overrides --txtype 2 |                              |             |
|           |    gasmaxpriority    |                           The type 0 tx `gasmaxpriority` (in `gwei`)                           |   float    | --overrides --txtype 2 |                              |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:set-entry \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--action insert \
--lot "1" \
--externaljobid 6fcef4f7-6325-4865-9dfe-64b3d8d7243e \
--oracleaddr 0xfF07C97631Ff3bAb5e5e5660Cdf47AdEd8D4d4Fd \
--requesttype 1 \
--requestparams '[{ "name": "base", "value": "BTC", "type": "string" },{ "name": "quote", "value": "USD", "type": "string" }]' \
--inactive false \
--payment "500000000000000000" \
--callbackaddr 0x02bA5E184De4eebDdCb865934DdecaEc6C9BFeF3 \
--callbackfunctionname "fulfillUint256(bytes32,uint256)" \
--startat "777" \
--interval "12345678" \
--mode forking
```

### Remove an Entry

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      net       |                     The network name                      |  network  |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |    address     |           The GenericConsumer contract address            |  address  |                        |                                                  |             |
|    ✅     |      mode      |                    The execution mode                     |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |     action     |                   The action to perform                   |  string   |                        |                `insert`, `update`                |             |
|    ✅     |      lot       |                      The entries lot                      | BigNumber |                        |                                                  |             |
|    ✅     |      key       |                 The Entry key (`bytes32`)                 |  bytes32  |                        |                                                  |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:remove-entry \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--lot "1" \
--key 0x15b6f8261480bdfabdf1d53bac0e3c8feabdc6db3462077e66502c5a5422892d \
--mode forking
```

### Remove a lot (including all its entries)

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      net       |                     The network name                      |  network  |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |    address     |           The GenericConsumer contract address            |  address  |                        |                                                  |             |
|    ✅     |      mode      |                    The execution mode                     |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |      lot       |                      The entries lot                      | BigNumber |                        |                                                  |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:remove-lot \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--lot "1" \
--mode forking
```

### Request a job via task arguments

Task parameters:

| Required? |         Name         |                                Description                                |    Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------------: | :-----------------------------------------------------------------------: | :--------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |         net          |                             The network name                              |  network   |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |       address        |                   The GenericConsumer contract address                    |  address   |                        |                                                  |             |
|    ✅     |         mode         |                            The execution mode                             |   string   |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |        action        |                           The action to perform                           |   string   |                        |    `request_data`, `request_data_and_forward`    |             |
|    ✅     |    externaljobid     | The Job Specification ID that the request will be created for (as UUIDv4) |   uuidv4   |                        |                                                  |             |
|    ✅     |      oracleaddr      |                        The oracle contract address                        |  address   |                        |                                                  |             |
|           |       payment        |                The amount of LINK (wei) paid to the oracle                | BigNumber  |                        |                                                  |             |
|    ✅     | callbackfunctionname |                 The function name to use for the callback                 |   string   |                        |                                                  |             |
|    ✅     |    requestparams     |              The the Chainlink request parameters (as JSON)               | JSON array |                        |                                                  |             |
|    ✅     |     requesttype      |                    The kind of Chainlink request sent                     |    int     |                        |           `0` (Oracle), `1` (Operator)           |             |
|           |     callbackaddr     |                  The address to operate the callback on                   |  address   |                        |                                                  |             |
|           |         cbor         |       **EXPERIMENTAL**. Generates the buffer using the CBOR library       |    Flag    |                        |                                                  |   `false`   |
|           |     logrequestid     |                          Logs the tx `requestId`                          |    Flag    |                        |                                                  |   `false`   |
|           | logrequestedentries  |            Logs all the entries requested (more granular data)            |    Flag    |                        |                                                  |   `false`   |
|           |      overrides       |         Allows customising the tx overrides (ethers.js Overrides)         |    Flag    |                        |                                                  |   `false`   |
|           |       gaslimit       |                             The tx `gasLimit`                             |    int     |      --overrides       |                                                  |             |
|           |        txtype        |                                The tx type                                |    int     |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |       gasprice       |                   The type 0 tx `gasPrice` (in `gwei`)                    |   float    | --overrides --txtype 0 |                                                  |             |
|           |      gasmaxfee       |                 The type 0 tx `maxFeePerGas` (in `gwei`)                  |   float    | --overrides --txtype 2 |                                                  |             |
|           |    gasmaxpriority    |                The type 0 tx `gasmaxpriority` (in `gwei`)                 |   float    | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:request \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--action request_data \
--externaljobid 6fcef4f7-6325-4865-9dfe-64b3d8d7243e \
--oracleaddr 0xfF07C97631Ff3bAb5e5e5660Cdf47AdEd8D4d4Fd \
--payment "100000000000000000" \
--callbackfunctionname "fulfillUint256(bytes32,uint256)" \
--requesttype 1 \
--requestparams '[]' \
--logrequestid \
--mode forking
```

```sh
yarn hardhat draft:genericconsumer:request \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--action request_data \
--externaljobid 6fcef4f7-6325-4865-9dfe-64b3d8d7243e \
--oracleaddr 0xfF07C97631Ff3bAb5e5e5660Cdf47AdEd8D4d4Fd \
--payment "100000000000000000" \
--callbackfunctionname "fulfillUint256(bytes32,uint256)" \
--requesttype 1 \
--requestparams '[{ "name": "base", "value": "LINK", "type": "string" },{ "name": "quote", "value": "USD", "type": "string" }]' \
--logrequestid \
--mode forking
```

### Request a job from a JSON entries file

Task parameters:

| Required? |        Name         |                              Description                               |  Type   |       Depends On       |                     Options                      | Defaults to |
| :-------: | :-----------------: | :--------------------------------------------------------------------: | :-----: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |         net         |                            The network name                            | network |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |       address       |                  The GenericConsumer contract address                  | address |                        |                                                  |             |
|    ✅     |      filename       | The entries filename (without `.json` extension) in the entries folder | string  |                        |                                                  |             |
|    ✅     |        mode         |                           The execution mode                           | string  |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |        jobid        |                   The entry jobId (TOML spec DB ID)                    | number  |                        |                                                  |             |
|    ✅     |       jobcase       |                           The entry jobCase                            | number  |                        |                                                  |             |
|           |        cbor         |     **EXPERIMENTAL**. Generates the buffer using the CBOR library      |  Flag   |                        |                                                  |   `false`   |
|           |    logrequestid     |                        Logs the tx `requestId`                         |  Flag   |                        |                                                  |   `false`   |
|           | logrequestedentries |          Logs all the entries requested (more granular data)           |  Flag   |                        |                                                  |   `false`   |
|           |      overrides      |       Allows customising the tx overrides (ethers.js Overrides)        |  Flag   |                        |                                                  |   `false`   |
|           |      gaslimit       |                           The tx `gasLimit`                            |   int   |      --overrides       |                                                  |             |
|           |       txtype        |                              The tx type                               |   int   |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |      gasprice       |                  The type 0 tx `gasPrice` (in `gwei`)                  |  float  | --overrides --txtype 0 |                                                  |             |
|           |      gasmaxfee      |                The type 0 tx `maxFeePerGas` (in `gwei`)                |  float  | --overrides --txtype 2 |                                                  |             |
|           |   gasmaxpriority    |               The type 0 tx `gasmaxpriority` (in `gwei`)               |  float  | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:request-file-entry \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--filename eth-goerli-demo-linkpool \
--jobid 66 \
--jobcase 1 \
--logrequestid \
--mode prod
```

### Perform upkeep

Task parameters:

| Required? |        Name        |                                   Description                                    |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :----------------: | :------------------------------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |        net         |                                 The network name                                 |  network  |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |      address       |                       The GenericConsumer contract address                       |  address  |                        |                                                  |             |
|    ✅     |        mode        |                                The execution mode                                |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|    ✅     |        lot         |                                 The entries lot                                  | BigNumber |                        |                                                  |             |
|           |      consumer      | The address (e.g. owner, consumer, Keeper) that pays the upkeep from its balance |  address  |                        |                                                  |             |
|           |    performdata     |                            The performData as `bytes`                            |   bytes   |                        |                                                  |             |
|           | performdatadecoded |           An array of Entry keys (`bytes32[]`), excl. lot (`uint256`)            | [bytes32] |                        |                                                  |             |
|           |    checkupkeep     |  Call first `checkUpkeep()` and pass returned `performData` to `performKeep()`   |   Flag    |                        |                                                  |   `false`   |
|           |   logrequestids    |                           Logs all the tx `requestId`                            |   Flag    |                        |                                                  |   `false`   |
|           |     overrides      |            Allows customising the tx overrides (ethers.js Overrides)             |   Flag    |                        |                                                  |   `false`   |
|           |      gaslimit      |                                The tx `gasLimit`                                 |    int    |      --overrides       |                                                  |             |
|           |       txtype       |                                   The tx type                                    |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |      gasprice      |                       The type 0 tx `gasPrice` (in `gwei`)                       |   float   | --overrides --txtype 0 |                                                  |             |
|           |     gasmaxfee      |                     The type 0 tx `maxFeePerGas` (in `gwei`)                     |   float   | --overrides --txtype 2 |                                                  |             |
|           |   gasmaxpriority   |                    The type 0 tx `gasmaxpriority` (in `gwei`)                    |   float   | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:performupkeep \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--lot "1" \
--consumer 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--checkupkeep \
--logrequestids \
--mode forking
```

Perform Upkeep passing `performData` decoded (as an array of keys `bytes32[]`):

```sh
yarn hardhat draft:genericconsumer:performupkeep \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--lot "1" \
--performdatadecoded '["0x79fd663d19a9aef543db50334010338258f6dde9703cd48beb627d7752a31413", "0xf3516c8ca770cfb64cee0746cfbbcf76dfb7802aa5da565fed55b4a4e11db7ed", "0xce6fd8d5e7b455d1d41566bf724fecb39b12c825619b8fb67cc74f9e422d3481", "0x15b6f8261480bdfabdf1d53bac0e3c8feabdc6db3462077e66502c5a5422892d", "0x96fc1e70723b646a5b5047d0f34f8b9082f28c1517ea659b645ba51ac3fe22fc"]' \
--mode forking
```

### Verify a GenericConsumer

Alternatively use [verify contract by address](../../tools/README.md#verify-a-contract-by-address)

Task parameters:

| Required? |    Name     |                          Description                          |   Type    | Depends On |                     Options                      |               Defaults to                |
| :-------: | :---------: | :-----------------------------------------------------------: | :-------: | :--------: | :----------------------------------------------: | :--------------------------------------: |
|    ✅     |   address   |                     The contract address                      |  address  |            |                                                  |                                          |
|    ✅     | description |                   The contract description                    |  string   |            |                                                  |                                          |
|    ✅     | mingaslimit | The minimum gas limit allowed to request on `performUpkeep()` | BigNumber |            |                                                  | `MIN_GAS_LIMIT_PERFORM_UPKEEP` (300_000) |
|    ✅     |   network   |                    Hardhat `network` param                    |  string   |            | See `networkUserConfigs` in `/utils/networks.ts` |                `hardhat`                 |

Example calls:

```sh
yarn hardhat draft:genericconsumer:verify \
--address 0x06228f0a1790975597c7ed1b2df9729894e52d94 \
--description "Optimism Mainnet" \
--mingaslimit "300000" \
--network eth-goerli
```

### Withdraw LINK from a consumer address

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |       Depends On       |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :--------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      net       |                     The network name                      |  network  |                        | See `networkUserConfigs` in `/utils/networks.ts` |             |
|    ✅     |    address     |           The GenericConsumer contract address            |  address  |                        |                                                  |             |
|    ✅     |      mode      |                    The execution mode                     |  string   |                        |                `forking`, `prod`                 |  `forking`  |
|           |    granular    |           Allows setting a payee and an amount            |   Flag    |                        |                                                  |             |
|           |     payee      |            The address that receives the LINK             |  address  |       --granular       |                                                  |             |
|           |     amount     |                      The LINK amount                      | BigNumber |       --granular       |                                                  |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                        |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |      --overrides       |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |      --overrides       |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --txtype 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --txtype 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --txtype 2 |                                                  |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:withdraw \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--net eth-goerli \
--mode forking
```

```sh
yarn hardhat draft:genericconsumer:withdraw \
--address 0x9881c53788bfe04a87aad4cdc3bedca0904d1f63 \
--amount "200000000000000000" \
--payee 0x4811eeDE2cA80Be1d13096beA7Fc947aa037510f \
--granular \
--net eth-goerli \
--mode forking
```

## Tools

### Generate an entry key

Task parameters:

| Required? |     Name      |                                Description                                |    Type    | Depends On | Options | Defaults to |
| :-------: | :-----------: | :-----------------------------------------------------------------------: | :--------: | :--------: | :-----: | :---------: |
|    ✅     | externaljobid | The Job Specification ID that the request will be created for (as UUIDv4) |   uuidv4   |            |         |             |
|    ✅     |  oracleaddr   |                        The oracle contract address                        |  address   |            |         |             |
|    ✅     | requestparams |              The the Chainlink request parameters (as JSON)               | JSON array |            |         |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:generate-key \
--externaljobid 6fcef4f7-6325-4865-9dfe-64b3d8d7243e \
--oracleaddr 0xfF07C97631Ff3bAb5e5e5660Cdf47AdEd8D4d4Fd \
--requestparams '[{ "name": "base", "value": "BTC", "type": "string" },{ "name": "quote", "value": "USD", "type": "string" }]'
```

```sh
yarn hardhat draft:genericconsumer:generate-key \
--externaljobid 9ca5d974-689a-48e1-acb9-b9898e235d37 \
--oracleaddr 0x9881C53788bFE04A87aad4cDc3BeDCA0904D1f63 \
--requestparams '[{ "name": "assetAddress", "value": "0xED5AF388653567Af2F388E6224dC7C4b3241C544", "type": "address" }]'
```

### Generate an entry key (input as bytes)

Task parameters:

| Required? |     Name      |                                 Description                                  |  Type   | Depends On | Options | Defaults to |
| :-------: | :-----------: | :--------------------------------------------------------------------------: | :-----: | :--------: | :-----: | :---------: |
|    ✅     | externaljobid | The Job Specification ID that the request will be created for (as `bytes32`) | bytes32 |            |         |             |
|    ✅     |  oracleaddr   |                         The oracle contract address                          | address |            |         |             |
|    ✅     |    buffer     |              The the Chainlink request parameters (as `bytes`)               |  bytes  |            |         |             |

Example calls:

```sh
yarn hardhat draft:genericconsumer:generate-key-bytes \
--specid 0x3736656331303137613737353436663961303634393130303131336164616564 \
--oracleaddr 0xfF07C97631Ff3bAb5e5e5660Cdf47AdEd8D4d4Fd \
--buffer 0x68656e64706f696e746a6b696d702d6461696c79
```
