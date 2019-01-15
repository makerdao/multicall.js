import Multicall from '../src';
import { getCurrency, ETH, USD, DAI } from '../src/Currency';
import BigNumber from 'bignumber.js';

const fromWei = value => BigNumber(value).shiftedBy(-18).toFixed();
const weiToCurrency = currency => value => getCurrency(fromWei(value), currency);

const multicall = new Multicall('kovan');

const MKR_WHALE = '0xdb33dfd3d61308c33c63209845dad3e6bfb2c674';

// Kovan addresses
multicall.setGlobals({
  priceFeeds: {
    eth: '0xa5aA4e07F5255E14F02B385b1f04b35cC50bdb66',
    mkr: '0xeBaa5D5cfe7F1201bebC6fb88240bBef285b4Fee',
    rep: '0xf88bbdc1e2718f8857f30a180076ec38d53cf296'
  },
  tokens: {
    mkr: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD',
    weth: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
    peth: '0xf4d791139cE033Ad35DB2B2201435fAd668B1b64',
    rep: '0x6fdc84f76093fa02facfb08844f5fb240a08c1d6'
  },
  tub: '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2',
  helper: '0x5b630ba8fe98ebed5381c868cd6b8d23875b6ca7'
});

multicall.createTemplates({
  tokenBalance: ({ currency, address, tokens }) => {
    return {
      target: tokens[currency],
      call: ['balanceOf(address)(uint256)', address],
      returns: [[`accounts.${address}.${currency}.balance`, weiToCurrency(currency)]],
      action: (results) => {
        const balance = results[`accounts.${address}.${currency}.balance`];
        console.log(`[ACTION] Balance of ${currency} for ${address}: ${balance}`);
      }
    };
  },
  totalSupply: ({ currency, tokens }) => {
    return {
      target: tokens[currency],
      call: ['totalSupply()(uint256)'],
      returns: [[`${currency}.totalSupply`, weiToCurrency(currency)]],
      action: (results) => {
        const totalSupply = results[`${currency}.totalSupply`];
        console.log(`[ACTION] Total supply of ${currency}: ${totalSupply}`);
      }
    };
  },
  priceFeed: ({ currency, priceFeeds }) => {
    return {
      target: priceFeeds[currency],
      call: ['peek()(uint256,bool)'],
      returns: [
        [`${currency}.value`, weiToCurrency(currency)],
        [`${currency}.set`]
      ],
      action: (results) => {
        const price = results[`${currency}.value`];
        console.log(`[ACTION] Latest price of ${currency}: ${price}`);
      }
    };
  },
  ethBalance: ({ helper, address }) => {
    return {
      target: helper,
      call: ['ethBalanceOf(address)(uint256)', address],
      returns: [[`ethBalance-${address}`, weiToCurrency(ETH)]]
    };
  },
  debtCeiling: ({ tub }) => {
    return {
      target: tub,
      call: ['cap()(uint256)'],
      returns: [['debtCeiling', weiToCurrency(DAI)]]
    };
  }
});

multicall.registerTemplates([
  ['debtCeiling'],
  ['tokenBalance', { currency: 'mkr', address: MKR_WHALE }],
  ['tokenBalance', { currency: 'weth', address: MKR_WHALE }],

  ['totalSupply', { currency: 'peth' }],
  ['totalSupply', { currency: 'weth' }],
  ['totalSupply', { currency: 'mkr' }],
  ['totalSupply', { currency: 'rep' }],

  ['priceFeed', { currency: 'eth' }],
  ['priceFeed', { currency: 'mkr' }],
  ['priceFeed', { currency: 'rep' }],

  ['ethBalance', { address: '0x72776bb917751225d24c07d0663b3780b2ada67c' }],
  ['ethBalance', { address: '0x7227bd52777cb85a89cb5f9eaf8e18f95ad91071' }]
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
