import Multicall from '../src';
import { Currency, getCurrency, ETH, USD, DAI, WETH } from '../src/Currency';

const multicall = new Multicall('kovan');

// tap: '0xc936749D2D0139174EE0271bD28325074fdBC654'
// vox: '0xBb4339c0aB5B1d9f14Bd6e3426444A1e9d86A1d9'
// pit: '0xbd747742B0F1f9791d3e6B85f8797A0cf4fbf10b'
// pip: '0xa5aA4e07F5255E14F02B385b1f04b35cC50bdb66'
// pep: '0xeBaa5D5cfe7F1201bebC6fb88240bBef285b4Fee'
// gem: '0xd0A1E359811322d97991E03f863a0C30C2cF029C'
// gov: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD'
// skr: '0xf4d791139cE033Ad35DB2B2201435fAd668B1b64'
// sai: '0xC4375B7De8af5a38a93548eb8453a498222C4fF2'
// sin: '0xdCDca4371bEFCeafA069Ca1e2AfD8b925b69e57b'
// proxy: '0x90d01F84F8Db06d9aF09054Fe06fb69C1f8ee9E9'
// tub: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2'

// Kovan contract addresses
multicall.setGlobals({
  contractAddressEthPriceFeed: '0xa5aA4e07F5255E14F02B385b1f04b35cC50bdb66',
  contractAddressMkrPriceFeed: '0xeBaa5D5cfe7F1201bebC6fb88240bBef285b4Fee',
  contractAddressTub: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2',
  contractAddressWeth: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
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
  wethTotalSupply: ({ contractAddressWeth }) => {
    return {
      to: contractAddressWeth,
      method: 'totalSupply()',
      returns: [
        ['wethTotalSupply', 'uint256', weiToCurrency(WETH)]
      ]
    };
  },
  ethBalance: ({ contractAddressHelperContract, address }) => {
    return {
      key: `eth.${address}.balance`,
      to: contractAddressHelperContract,
      method: 'ethBalanceOf(address)',
      args: [[address, 'address']],
      returns: [[`ethBalance-${address}`, 'uint256', weiToCurrency(ETH)]]
    };
  },
  debtCeiling: ({ contractAddressTub }) => {
    return {
      to: contractAddressTub,
      method: 'cap()',
      returns: [['debtCeiling', 'uint256', weiToCurrency(DAI)]]
    };
  }
});

multicall.registerTemplates([
  ['ethPriceFeed'],
  ['mkrPriceFeed'],
  ['debtCeiling'],
  ['wethTotalSupply'],
  ['ethBalance', { address: '0x72776bb917751225d24c07d0663b3780b2ada67c', ignoreUnchanged: true }],
  ['ethBalance', { address: '0x7227bd52777cb85a89cb5f9eaf8e18f95ad91071', ignoreUnchanged: true }]
]);

multicall.startPolling();

// Receives all updates
// multicall.onUpdate(results => {
//   console.log('Results:', results);
// });

// Receives separate update for each template registered
multicall.onEachUpdate((key, value) => {
  console.log(`[${key}] = ${value}`);
});
