import Multicall from '../src';
import { Currency, getCurrency, ETH, USD } from '../src/Currency';

const multicall = new Multicall('kovan');

// Kovan contract addresses
multicall.setGlobals({
  contractAddressEthPriceFeed: '0xa5aA4e07F5255E14F02B385b1f04b35cC50bdb66',
  contractAddressMkrPriceFeed: '0xeBaa5D5cfe7F1201bebC6fb88240bBef285b4Fee',
  contractAddressHelperContract: '0x5b630ba8fe98ebed5381c868cd6b8d23875b6ca7'
});

function weiToCurrency(currency) {
  return value => getCurrency(new Currency(value, -18).toBigNumber(), currency).toString();
}

multicall.createTemplates({
  ethPriceFeed: ({ contractAddressEthPriceFeed }) => {
    return {
      to: contractAddressEthPriceFeed,
      method: 'peek()',
      returns: [
        ['ethPrice.value', 'uint256', weiToCurrency(USD)],
        ['ethPrice.set', 'bool']
      ]
    };
  },
  mkrPriceFeed: ({ contractAddressMkrPriceFeed }) => {
    return {
      to: contractAddressMkrPriceFeed,
      method: 'peek()',
      returns: [
        ['mkrPrice.value', 'uint256', weiToCurrency(USD)],
        ['mkrPrice.set', 'bool']
      ]
    };
  },
  ethBalance: ({ contractAddressHelperContract, address }) => {
    return {
      to: contractAddressHelperContract,
      method: 'ethBalanceOf(address)',
      args: [[address, 'address']],
      returns: [[`ethBalance-${address}`, 'uint256', weiToCurrency(ETH)]]
    };
  }
});

multicall.registerTemplates([
  ['ethPriceFeed'],
  ['mkrPriceFeed'],
  ['ethBalance', { address: '0x72776bb917751225d24c07d0663b3780b2ada67c' }],
  ['ethBalance', { address: '0x7227bd52777cb85a89cb5f9eaf8e18f95ad91071' }]
]);

multicall.startPolling();
multicall.onUpdate(results => {
  console.log('Results:', results);
});
