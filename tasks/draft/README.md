# Direct Request Automation Framework for Testing (DRAFT)

A framework for end-to-end testing directrequest jobs.

## Features

### The GenericConsumer contract

- A single ChainlinkClient that builds & sends any Chainlink request, and fulfills them.
- Allows to fulfuill a request on an external contract (split consumer pattern; the requester contract is not the fulfillment one).
- Logs the fulfilled request data.
- CRUD job requests (Entry/entries) by lot in the storage.
- Allows to batch request entries by lot, and it can be keeperised (contract is Keepers' compatible).
- Allows to cancel a pending request and get refunded its LINK payment held in escrow.
- Implements internal consumers' LINK balances.
- Implements an emergency stop mechanism (pause).

### CLI

- Request on-demand any job* on the network in a human-readable way from commandline args, JSON file or contract storage.
  *As long as the TOML spec does not whitelist requesters.
- Collect & decode the fulfilled request.
- CRUD job requests (Entry/entries) in the contract storage (by lot). Import them from task args or JSON file.
- Batch request entries in the contract storage.
- Manage the contract settings, and consumer's LINK balances.
- Access a bunch of Chainlink-dev and nodeop related tools, e.g. externalJobID to bytes32, function signature to function selector, etc.

### Automate job requests

- **Time-based**:
  - **Automation time-based**: ideal case for single job requests on production via `requestData()` and `requestDataAndForwardResponse()`.
  - **Chainlink cron job**: ideal case for single job requests on non-production tasks (e.g. development, chores) via `requestData()` and `requestDataAndForwardResponse()`.
- **Block-based**:
  - **Automation Custom logic**:
    - Ideal case for batch job requests via `checkUpkeep` and `performUpkeep`.
    - Schedule batch job requests with granularity (by lot, and Entry schedule).
    - Handle gracefully the `checkGasLimit` on each network.

Make sure to:

- Fund the LINK balance of the consumer address. If `msg.sender == owner` the address is the GenericConsumer one, otherwise the address is `msg.sender`.
- Monitor the LINK balance of the consumer address via `availableFunds()`.
- Automation `msg.sender`:
  - Custom Logic: the [Registry address](https://docs.chain.link/docs/chainlink-automation/supported-networks/#registry-and-registrar-addresses).
  - Time-based: the deployed `CronUkpeep` contract address after registering the Upkeep.
- Allow upkeeps on the lot (via `setIsUpkeepAllowed()`) when calling `performUpkeep()` and `msg.sender != owner()`; it requires that the lots supports upkeeps.

## Contracts

Contracts:

- [GenericConsumer.sol](../../contracts/draft/v0.8/GenericConsumer.sol)
- [ChainlinkExternalFulfillmentCompatible.sol](../../contracts/draft/v0.8/ChainlinkExternalFulfillmentCompatible.sol)
- [ChainlinkFulfillment.sol](../../contracts/draft/v0.8/ChainlinkFulfillment.sol)

Dev contracts:

- [GenericFulfillment.sol](../../contracts/draft/v0.8/dev/GenericFulfillment.sol)
- [GenericFulfillmentUUPS.sol](../../contracts/draft/v0.8/dev/GenericFulfillmentUUPS.sol)
- [GenericFulfillmentUUPSV2.sol (example)](../../contracts/draft/v0.8/dev/GenericFulfillmentUUPSV2.sol)

Interfaces:

- [IChainlinkExternalFulfillment.sol](../../contracts/draft/v0.8/interfaces/IChainlinkExternalFulfillment.sol)
- [IGenericConsumer.sol](../../contracts/draft/v0.8/interfaces/IGenericConsumer.sol)

Libraries (internal):

- [EntryLibrary.sol](../../contracts/draft/v0.8/libraries/internal/EntryLibrary.sol)
- [LotLibrary.sol](../../contracts/draft/v0.8/libraries/internal/LotLibrary.sol)

## Tasks & Tools

Tasks:

- [GenericConsumer](./generic-consumer/README.md)
- [GenericFulfillment](./generic-fulfillment/README.md)

Tools:

- [Tools](../tools/README.md)
