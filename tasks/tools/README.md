# Tools

## ABI

[Source](./abi.ts)

### Generate the function signature (bytes4)

Task parameters:

| Required? |   Name   |    Description    |  Type  | Depends On | Options | Defaults to |
| :-------: | :------: | :---------------: | :----: | :--------: | :-----: | :---------: |
|    ✅     | function | The function name | string |            |         |             |

Example calls:

```sh
yarn hardhat tools:abi:functionsignature \
--function "fulfillBytesArray(bytes32,bytes[])"
```

```sh
yarn hardhat tools:abi:functionsignature \
--function "fulfillUint256Array(bytes32,uint256[])"
```

## Chainlink

[Source](./chainlink.ts)

### Approve LINK amount

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |      Depends On      |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :------------------: | :----------------------------------------------: | :---------: |
|    ✅     |    spender     |                    The spender address                    |  address  |                      |                                                  |             |
|    ✅     |     amount     |                 The amount to be approved                 | BigNumber |                      |                                                  |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                      |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |     --overrides      |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |     --overrides      |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --type 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --type 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --type 2 |                                                  |             |
|    ✅     |    network     |                  Hardhat `network` param                  |  string   |                      | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat tools:chainlink:approve \
--spender 0xED5AF388653567Af2F388E6224dC7C4b3241C544 \
--amount "7770000000000000000000" \
--network eth-kovan
```

### Convert an externalJobID (UUID v4) to bytes32

Task parameters:

| Required? | Name  |         Description         |  Type  | Depends On | Options | Defaults to |
| :-------: | :---: | :-------------------------: | :----: | :--------: | :-----: | :---------: |
|    ✅     | jobid | The externalJobID (UUID v4) | uuidv4 |            |         |             |

Example calls:

```sh
yarn hardhat tools:chainlink:jobid-to-bytes32 \
--jobid 2f6867e2-9075-48cf-a918-d5d291da94ce
```

### Convert bytes32 to an externalJobID (UUID v4)

Task parameters:

| Required? | Name  |                   Description                    |  Type   | Depends On | Options | Defaults to |
| :-------: | :---: | :----------------------------------------------: | :-----: | :--------: | :-----: | :---------: |
|    ✅     | jobid | The `bytes32` representation of an externalJobID | bytes32 |            |         |             |

Example calls:

```sh
yarn hardhat tools:chainlink:bytes32-to-jobid \
--jobid 0x3266363836376532393037353438636661393138643564323931646139346365
```

### Calculate the Chainlink.Request buffer (bytes) from the request parameters

Task parameters:

| Required? |  Name  |                                                   Description                                                    |    Type    | Depends On | Options | Defaults to |
| :-------: | :----: | :--------------------------------------------------------------------------------------------------------------: | :--------: | :--------: | :-----: | :---------: |
|    ✅     | params | The request parametars as JSON (format: `[{"name": <string>, "value": <any>, "type": <RequestParamType>}, ...]`) | JSON array |            |         |             |
|           | nosort |                                  Do not sort 'params' alphabetically by 'name'                                   |    Flag    |            |         |   `false`   |
|           |  cbor  |                          **EXPERIMENTAL** - Calculate the buffer using the cbor package                          |    Flag    |            |         |   `false`   |

Supported RequestParamsType `type`, `value`, and `valueTypes`:

|      Type       |                                               Value                                               |                              Value Types                              |                                     Notes                                     |
| :-------------: | :-----------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------: | :---------------------------------------------------------------------------: |
|    `address`    |                    Hex string (`"0x0000000000000000000000000000000000000000"`)                    |                                                                       |                      LinkPool custom. Encodes an address                      |
| `address_array` |            Array of hex string (`["0x0000000000000000000000000000000000000000", ...]`)            |                                                                       |                  LinkPool custom. Encodes array of addresses                  |
|     `bytes`     |                      Array of any values (`'[[777, 42], "0x...", "OK;LG"]'`)                      | Array of Solidity data types (`'["uint256[]", "address", "string"]'`) |              LinkPool custom. Encodes values like `abi.encode()`              |
| `bytes_packed`  |                      Array of any values (`'[[777, 42], "0x...", "OK;LG"]'`)                      |  Array of Solidity data types (`'["uint8[]", "address", "string"]'`)  |           LinkPool custom. Encodes values like `abi.encodePacked()`           |
|   `bytes_raw`   |                                      Hex string (`"0x..."`)                                       |                                                                       |                              Chainlink built-in                               |
|      `int`      |            signed number (`-1`) or string (`"-9007199254740991000"`, for big numbers)             |                                                                       |                              Chainlink built-in                               |
|   `int_array`   | Array of signed number (`[-1, ...]`) or string (`["-9007199254740991000", ...]`, for big numbers) |                                                                       | LinkPool custom. Requires extending the consumer contract with `addIntArray`  |
|    `string`     |                                       string (`"string1"`)                                        |                                                                       |                              Chainlink built-in                               |
| `string_array`  |                               Array of strings (`["string1", ...]`)                               |                                                                       |                              Chainlink built-in                               |
|     `uint`      |            unsigned number (`1`) or string (`"9007199254740991000"`, for big numbers)             |                                                                       |                              Chainlink built-in                               |
|  `uint_array`   | Array of unsigned number (`[1, ...]`) or string (`["9007199254740991000", ...]`, for big numbers) |                                                                       | LinkPool custom. Requires extending the consumer contract with `addUintArray` |

Example calls:

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "azuky", "value": "0xED5AF388653567Af2F388E6224dC7C4b3241C544", "type": "address" }]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "requestId", "value": [[777, 42], "OK;LG", "0x514910771AF9Ca656af840dff83E8264EcF986CA"], "type": "bytes", "valueTypes": ["uint16[]", "string", "address"] }]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "requestId", "value": [1, 2, "DL2953"], "type": "bytes_packed", "valueTypes": ["uint8", "uint256", "string"] }]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "requestId", "value": "0x0102", "type": "bytes_raw" }]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "base", "value": "BTC", "type": "string" }, { "name": "quote", "value": "USD", "type": "string"}]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--chainlink \
--params '[{ "name": "max", "value": "9007199254740992", "type": "uint" }]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "numbers", "value": [1, 2, 3, 4], "type": "uint_array" }]' \
--cbor
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[{ "name": "days", "value": "7", "type": "string" },{ "name": "address", "value": "0x896E90716f673E0003452f700A0ba44bBFc49c79", "type": "string" },{ "name": "endpoint", "value": "contains-most-visited-location", "type": "string" },{ "name": "countryCodes", "value": "PT-ES-FR-IT-US", "type": "string" }]'
```

```sh
yarn hardhat tools:chainlink:buffer \
--params '[
{ "name": "sportId", "value": "7", "type": "uint" },
{ "name": "market", "value": "0", "type": "uint" },
{ "name": "timestamp", "value": "1663970660", "type": "uint" },
{ "name": "statusIds", "value": [3, 11], "type": "uint_array" },
{ "name": "gameIds", "value": [["0x6261646533363031633566663439363538366436333663333939356630366665", "0x8dce4c87c709cbe2e5f966074e62903e7ec5c6178f5c654286c49d7b79a65953"]],
  "type": "bytes", "valueTypes": ["bytes32[]"]}
]'
```

### Transfer a LINK amount

Task parameters:

| Required? |      Name      |                        Description                        |   Type    |      Depends On      |                     Options                      | Defaults to |
| :-------: | :------------: | :-------------------------------------------------------: | :-------: | :------------------: | :----------------------------------------------: | :---------: |
|    ✅     |       to       |                   The receiver address                    |  address  |                      |                                                  |             |
|    ✅     |     amount     |                   The amount to be sent                   | BigNumber |                      |                                                  |             |
|           |   overrides    | Allows customising the tx overrides (ethers.js Overrides) |   Flag    |                      |                                                  |   `false`   |
|           |    gaslimit    |                     The tx `gasLimit`                     |    int    |     --overrides      |                                                  |             |
|           |     txtype     |                        The tx type                        |    int    |     --overrides      |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |           The type 0 tx `gasPrice` (in `gwei`)            |   float   | --overrides --type 0 |                                                  |             |
|           |   gasmaxfee    |         The type 0 tx `maxFeePerGas` (in `gwei`)          |   float   | --overrides --type 2 |                                                  |             |
|           | gasmaxpriority |        The type 0 tx `gasmaxpriority` (in `gwei`)         |   float   | --overrides --type 2 |                                                  |             |
|    ✅     |    network     |                  Hardhat `network` param                  |  string   |                      | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat tools:chainlink:transfer \
--to 0xED5AF388653567Af2F388E6224dC7C4b3241C544 \
--amount "7770000000000000000000" \
--network eth-kovan
```

## Gas

[Source](./gas.ts)

### Estimate TKN gas per network

Estimation done via ethers.js provider `getFeeData()`.

Example calls:

```sh
yarn hardhat tools:gas:estimate --network matic-mainnet
```

## Library Contracts

[Library](./verify.ts)

### Deploy a library contract

Deploy any library that requires to be linked on deployment later on.

**BE AWARE**: use [verify a contract by address](#verify-a-contract-by-address) if the verification fail.

Optionally:

- Verify it (`--verify` flag).
- Customise tx overrides (`--overrides` flag).

Task parameters:

| Required? |      Name      |                                                        Description                                                        |  Type  |      Depends On      |                     Options                      | Defaults to |
| :-------: | :------------: | :-----------------------------------------------------------------------------------------------------------------------: | :----: | :------------------: | :----------------------------------------------: | :---------: |
|    ✅     |      name      |                                        The consumer contract name (case sensitive)                                        | string |                      |                                                  |             |
|           |     verify     |                                       Verifies the contract on Etherscan at the end                                       |  Flag  |                      |                                                  |   `false`   |
|           |    contract    | The contract project path. This argument is required when more than one contract was found to match the deployed bytecode | string |       --verify       |                                                  |             |
|           |   overrides    |                                 Allows customising the tx overrides (ethers.js Overrides)                                 |  Flag  |                      |                                                  |   `false`   |
|           |    gaslimit    |                                                     The tx `gasLimit`                                                     |  int   |     --overrides      |                                                  |             |
|           |     txtype     |                                                        The tx type                                                        |  int   |     --overrides      |           `0` (legacy), `2` (EIP-1559)           |             |
|           |    gasprice    |                                           The type 0 tx `gasPrice` (in `gwei`)                                            | float  | --overrides --type 0 |                                                  |             |
|           |   gasmaxfee    |                                         The type 0 tx `maxFeePerGas` (in `gwei`)                                          | float  | --overrides --type 2 |                                                  |             |
|           | gasmaxpriority |                                        The type 0 tx `gasmaxpriority` (in `gwei`)                                         | float  | --overrides --type 2 |                                                  |             |
|    ✅     |    network     |                                                  Hardhat `network` param                                                  | string |                      | See `networkUserConfigs` in `/utils/networks.ts` |  `hardhat`  |

Example calls:

```sh
yarn hardhat tools:library:deploy \
--name IterableMappingSpecRequestId \
--verify \
--network eth-kovan
```

```sh
yarn hardhat tools:library:deploy \
--name EntryLibrary \
--contract 'contracts/linkpool/EntryLibrary.sol:EntryLibrary' \
--verify \
--network eth-kovan
```

```sh
yarn hardhat tools:library:deploy \
--name IterableMappingSpecRequestId \
--verify \
--network eth-kovan \
--overrides \
--txtype 0 \
--gasprice 3
```

```sh
yarn hardhat tools:library:deploy \
--name IterableMappingSpecRequestId \
--verify \
--network eth-kovan \
--overrides \
--gaslimit 10000000 \
--txtype 2 \
--gasmaxfee 145 \
--gasmaxpriority 2
```

### Verify a library contract

Alternatively use [verify contract by address](#verify-a-contract-by-address)

Task parameters:

| Required? |  Name   |     Description      |  Type   | Depends On | Options | Defaults to |
| :-------: | :-----: | :------------------: | :-----: | :--------: | :-----: | :---------: |
|    ✅     | address | The contract address | address |            |         |             |

Example calls:

```sh
yarn hardhat tools:library:verify \
--address 0xf78bEE39fE8aEe48DeF63319aDA43cDF8Bf86354 \
--network eth-kovan
```

## Verify Contracts

[Verify](./verify.ts)

### Verify a contract by address

**BE AWARE**: this is a friendly wrapper of the default [hardhat-etherscan](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#usage) verification usage.

Task parameters:

| Required? |   Name   |                                                        Description                                                        |  Type   | Depends On | Options | Defaults to |
| :-------: | :------: | :-----------------------------------------------------------------------------------------------------------------------: | :-----: | :--------: | :-----: | :---------: |
|    ✅     | address  |                                                   The contract address                                                    | address |            |         |             |
|           | contract | The contract project path. This argument is required when more than one contract was found to match the deployed bytecode |  sring  |            |         |             |

Example calls:

```sh
yarn hardhat tools:verify:by-address \
--address 0xd94AE693007BF5eE652BB0a8bD09A5aE10EA1Bd0 \
--network matic-mumbai
```

```sh
yarn hardhat tools:verify:by-address \
--address 0xfAdc73c2972757E0EE3a291f1f4A206E294ca68A \
--contract 'contracts/linkpool/EntryLibrary.sol:EntryLibrary' \
--network eth-kovan
```
