# DRAFT - Direct Request Automation Framework for Testing

## Blogposts

- [LinkPool Blog - Direct Request Automation Framework for Testing (DRAFT)](https://linkpool.io/resources/direct-request-automation-framework-testing)

## Content

- [Contracts](./contracts)
- [Jobs](./jobs)
- [Tasks](./tasks/README.md)

## Usage

### DRAFT - From Zero To Hero

- [DRAFT 101](./media/BLOGPOST_01.md)

### Pre Requisites

1. Using as a referenece `.env.example` create a `.env` and set the environment variables. If you don't already have a BIP-39 compatible mnemonic, use this [website](https://iancoleman.io/bip39/) to generate one.

2. Install the dependencies:

```sh
yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn typechain
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
$ REPORT_GAS=true yarn test
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```

# IDE Setup

## Syntax Highlighting

### VSCode

You can enjoy syntax highlighting for your Solidity code via the
[vscode-solidity](https://github.com/juanfranblanco/vscode-solidity) extension. The recommended approach to set the
compiler version is to add the following fields to your VSCode user settings:

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.17+commit.8df45f5f",
  "solidity.defaultCompiler": "remote"
}
```

Where of course `v0.8.17+commit.8df45f5f` can be replaced with any other version.

## Linting and Style

### VSCode

Solidity settings are:

```json
{
  "solidity.formatter": "prettier"
}
```

# Resources

Stack:

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/EthWorks/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Solcover](https://github.com/sc-forks/solidity-coverage): code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter
- [Chainlink Smart Contracts](https://www.npmjs.com/package/@chainlink/contracts): Chainlink smart contracts and their ABIs

Faucets:

- [LINK](https://faucets.chain.link/)
- [AVAX Fuji](https://faucet.avax-test.network/)
- [BSC Testnet](https://testnet.binance.org/faucet-smart)
- [ETH Kovan](https://gitter.im/kovan-testnet/faucet)
- [ETH Rinkeby](https://faucet.rinkeby.io/)
- [ETH Goerli faucet](https://faucet.goerli.mudit.blog/)
- [FTM Opera](https://faucet.fantom.network/)
- [MATIC Mumbai](https://faucet.polygon.technology/)
- [RSK](https://faucet.rsk.co/)
- [XDAI](https://xdai-faucet.top/)

Explorers:

- [ARB Goerli](https://goerli.arbiscan.io/)
- [ARB Mainnet](https://explorer.offchainlabs.com/)
- [ARB Rinkeby](https://rinkeby-explorer.arbitrum.io/)
- [AVAX Fuji](https://cchain.explorer.avax-test.network/)
- [AVAX Mainnet](https://cchain.explorer.avax.network/)
- [BSC Mainnet](https://bscscan.com/)
- [BSC Tesnet](https://testnet.bscscan.com/)
- [ETH Goerli](https://goerli.etherscan.io/)
- [ETH Kovan](https://kovan.etherscan.io/)
- [ETH Mainnet](https://etherscan.io/)
- [ETH Rinkeby](https://rinkeby.etherscan.io/)
- [FTM Mainnet](https://ftmscan.com/)
- [FTM Testnet](https://testnet.ftmscan.com/)
- [HECO Mainnet](https://scan.hecochain.com/)
- [HECO Testnet](https://scan-testnet.hecochain.com/home/index)
- [KLAYTN Baobab](https://baobab.scope.klaytn.com/)
- [MATIC Mainnet](https://polygonscan.com/)
- [MATIC Mumbai](https://mumbai.polygonscan.com/)
- [METIS Mainnet](https://andromeda-explorer.metis.io/)
- [MOONBEAM Mainnet](https://moonscan.io/)
- [MOONBEAM Moonriver](https://moonriver.moonscan.io/)
- [ONE Mainnet](https://explorer.harmony.one/)
- [OPT Goerli](https://goerli-optimism.etherscan.io/)
- [OPT Kovan](https://kovan-optimistic.etherscan.io/)
- [OPT Mainnet](https://optimistic.etherscan.io/)
- [POA Sokol](https://blockscout.com/poa/sokol/)
- [RSK Mainnet](https://explorer.rsk.co/)
- [XDAI Mainnet](https://blockscout.com/xdai/mainnet/)

Free Tier Providers:

- [Alchemy](https://www.alchemy.com/)
- [Infura](https://infura.io/)
- [QuickNode](https://www.quicknode.com/)
