# Multicall.js <img width="100" align="right" alt="Multicall" src="https://user-images.githubusercontent.com/304108/55666937-320cb180-5888-11e9-907b-48ba66150523.png" />

[![npm version](https://img.shields.io/npm/v/@makerdao/multicall.svg?style=flat-square)](https://www.npmjs.com/package/@makerdao/multicall)

**Multicall.js** is a lightweight JavaScript library for interacting with the [multicall](https://github.com/makerdao/multicall) smart contract.

Multicall allows multiple smart contract constant function calls to be grouped into a single call and the results aggregated into a single result. This reduces the number of separate JSON RPC requests that need to be sent over the network if using a remote node like Infura, and provides the guarantee that all values returned are from the same block. The latest block number is also returned along with the aggregated results.

## Summary

- Get the return value(s) of multiple smart contract function calls in a single call
- Guarantee that all values are from the same block
- Use watchers to poll for multiple blockchain state variables/functions
- Get updates when a watcher detects state has changed
- Results from out of sync nodes are automatically ignored
- Get new block updates

## Installation

```bash
yarn add @makerdao/multicall
```

## Usage

```javascript
import { createWatcher } from '@makerdao/multicall';

// Contract addresses used in this example
const MKR_TOKEN = '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd';
const MKR_WHALE = '0xdb33dfd3d61308c33c63209845dad3e6bfb2c674';
const MKR_FISH = '0x2dfcedcb401557354d0cf174876ab17bfd6f4efd';

// Preset can be 'mainnet', 'kovan', 'rinkeby', 'goerli' or 'xdai'
const config = { preset: 'kovan' };

// Create watcher
const watcher = createWatcher(
  [
    {
      target: MKR_TOKEN,
      call: ['balanceOf(address)(uint256)', MKR_WHALE],
      returns: [['BALANCE_OF_MKR_WHALE', val => val / 10 ** 18]]
    }
  ],
  config
);

// Subscribe to state updates
watcher.subscribe(update => {
console.log(`Update: ${update.type} = ${update.value}`);
});

// Subscribe to batched state updates
watcher.batch().subscribe(updates => {
  // Handle batched updates here
  // Updates are returned as { type, value } objects, e.g:
  // { type: 'BALANCE_OF_MKR_WHALE', value: 70000 }
});

// Subscribe to new block number updates
watcher.onNewBlock(blockNumber => {
  console.log('New block:', blockNumber);
});

// Start the watcher polling
watcher.start();
```

```javascript
// The JSON RPC URL and multicall contract address can also be specified in the config:
const config = {
  rpcUrl: 'https://kovan.infura.io',
  multicallAddress: '0xc49ab4d7de648a97592ed3d18720e00356b4a806'
};
```

```javascript
// Update the watcher calls using tap()
const fetchWaiter = watcher.tap(calls => [
  // Pass back existing calls...
  ...calls,
  // ...plus new calls
  {
    target: MKR_TOKEN,
    call: ['balanceOf(address)(uint256)', MKR_FISH],
    returns: [['BALANCE_OF_MKR_FISH', val => val / 10 ** 18]]
  }
]);
// This promise resolves when the first fetch completes
fetchWaiter.then(() => {
  console.log('Initial fetch completed');
});
```

```javascript
// Recreate the watcher with new calls and config (allowing the network to be changed)
const config = { preset: 'mainnet' };
watcher.recreate(
  [
    {
      target: MKR_TOKEN,
      call: ['balanceOf(address)(uint256)', MKR_WHALE],
      returns: [['BALANCE_OF_MKR_WHALE', val => val / 10 ** 18]]
    }
  ],
  config
);
```

## Helper Functions
Special variables and functions (e.g. `addr.balance`, `block.blockhash`, `block.timestamp`) can be accessed by calling their corresponding helper function.
To call these helper functions simply omit the `target` property (and it will default to multicall's contract address).
```javascript
const watcher = createWatcher(
  [
    {
      call: [
        'getEthBalance(address)(uint256)', 
        '0x72776bb917751225d24c07d0663b3780b2ada67c'
      ],
      returns: [['ETH_BALANCE', val => val / 10 ** 18]]
    },
    {
      call: ['getBlockHash(uint256)(bytes32)', 11482494],
      returns: [['SPECIFIC_BLOCK_HASH_0xFF4DB']]
    },
    {
      call: ['getLastBlockHash()(bytes32)'],
      returns: [['LAST_BLOCK_HASH']]
    },
    {
      call: ['getCurrentBlockTimestamp()(uint256)'],
      returns: [['CURRENT_BLOCK_TIMESTAMP']]
    },
    {
      call: ['getCurrentBlockDifficulty()(uint256)'],
      returns: [['CURRENT_BLOCK_DIFFICULTY']]
    },
    {
      call: ['getCurrentBlockGasLimit()(uint256)'],
      returns: [['CURRENT_BLOCK_GASLIMIT']]
    },
    {
      call: ['getCurrentBlockCoinbase()(address)'],
      returns: [['CURRENT_BLOCK_COINBASE']]
    }
  ],
  { preset: 'kovan' }
);
```

## Examples

Check out this [CodePen example](https://codepen.io/michaelelliot/pen/MxEpNX?editors=0010) for a working front-end example.

To run the example in the project, first clone this repo:

```bash
git clone https://github.com/makerdao/multicall.js
```

Then install the dependencies:

```bash
yarn
```

Finally run the example script (`examples/es-example.js`):

```bash
yarn example
```

## Test

To run tests use:

```bash
yarn test
```
