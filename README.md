# Multicall.js

**Multicall.js** is a lightweight JavaScript library for interacting with the [multicall](https://github.com/makerdao/multicall) smart contract.

Multicall allows multiple view calls to be grouped into a single call and the results aggregated into a single result from the multicall contract. This reduces the number of separate JSON RPC requests that need to be sent over the network if using a remote node like Infura, and the assurance that all values returned are from the same block. (The latest block number is returned along with the aggregated results).

Currently supported data types are: booleans, integers, addresses, fixed-size byte arrays (e.g. bytes32)

## Summary

- Get the return value from different smart contract function calls in a single call
- Assurance that all values are from the same block number / block height
- Compare the returned block number against the previous call's block number to know if it's possible for any returned values to be different (i.e. for polling)

## Installation

```
yarn add @makerdao/multicall

-- or --

npm install @makerdao/multicall
```

## Usage

```
import MultiCall from "@makerdao/multicall";
const multicall = new MultiCall('kovan'); // kovan or mainnet

const run = async () => {
    const { blockNumber, mkrBalance, priceFeed } = await multicall.aggregate([
        // MKR balance of some address
        {
            to: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD',
            method: 'balanceOf(address)',
            args:  [['0x72776bb917751225d24c07d0663b3780b2ada67c', 'address']],
            returns: [['mkrBalance', 'uint256']]
        },
        // address of the ETH:USD price feed used Maker's cdp engine
        {
            to: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2',
            method: 'pip()',
            returns: [['priceFeed', 'address']]
        },
        // ... etc, many more value reads are possible w/ this request
    ]) // all of these values are fetched within a single call
}

run();

 -- or --

multicall.aggregate([
    // MKR balance of some address
    {
        to: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD',
        method: 'balanceOf(address)',
        args:  [['0x72776bb917751225d24c07d0663b3780b2ada67c', 'address']],
        returns: [['mkrBalance', 'uint256']]
    },
    // address of the ETH:USD price feed used Maker's cdp engine
    {
        to: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2',
        method: 'pip()',
        returns: [['priceFeed', 'address']]
    },
    // ... etc, many more value reads are possible w/ this request
]).then(({ blockNumber, mkrBalance, priceFeed }) => {
    // all of these values are fetched within a single call
})
```

## Examples

First, clone this Repo

```
git clone https://github.com/makerdao/multicall.js
```

Then use `npm` or `yarn` to install the dependencies:

```
yarn
```

Finally run the example from the `examples` folder:

```
yarn examples
```

## Test

To run tests use:

```
yarn test
```
