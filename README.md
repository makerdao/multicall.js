# Multicall.js

**Multicall.js** is a JavaScript library for interacting with the [multicall](https://github.com/makerdao/multicall) smart contract.

Using multicall allows multiple calls to constant functions to be grouped into one call and the results from the calls aggregated into a single result from the multicall contract. This reduces the number of separate JSON RPC requests that need to be sent over the network if using a remote node like Infura, and the assurance that all values returned are from the same block. (The latest block number is returned along with the aggregated results.)

Currently supported data types are: booleans, integers, addresses, fixed-size byte arrays (e.g. bytes32)

## Summary

- Get the return value from different smart contract function calls in a single call
- Assurance that all values are from the same block number / block height
- Compare the returned block number against the previous call's block number to know if it's possible for any returned values to be different

## API

```
const multicall = new MultiCall('kovan');

const { blockNumber, mkrBalance, priceFeed } = await multicall.multicall({
    calls: [
        // MKR balance of some address
        {
            to: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD',
            method: 'balanceOf(address)',
            args:  [['0x72776bb917751225d24c07d0663b3780b2ada67c', 'address']],
            returns: [['mkrBalance', 'uint256']]
        },
        // address of Maker's ETH:USD price feed
        {
            to: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2',
            method: 'pip()',
            returns: [['priceFeed', 'address']]
        },
        // ... etc, many more value reads possible w/ this single requiest
    ] // all these calls happen w/ one call to the node
})
```

## Examples

First use `npm` or `yarn` to install the dependencies:

```
yarn install
```

Then run an example from the `examples` folder:

```
yarn examples
```

## Test

To run tests use:

```
yarn test
```
