import BigNumber from 'bignumber.js';
import { padLeft } from '../src/helpers';

const toWei = v => BigNumber(v).shiftedBy(18).toString();
const fromWei = v => BigNumber(v).shiftedBy(-18).toString();
const toWord = (value) => padLeft(BigNumber(value).toString(16), 64);
const toWords = (...values) => values.map(toWord).join('');

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

export const calls = [
  {
    call: ['getEthBalance(address)(uint256)', MOCK_ADDRESS],
    returns: [['BALANCE_OF_ETH_WHALE', fromWei]]
  },
  {
    target: MOCK_ADDRESS,
    call: ['balanceOf(address)(uint256)', MOCK_ADDRESS],
    returns: [['BALANCE_OF_MKR_WHALE', fromWei]]
  },
  {
    target: MOCK_ADDRESS,
    call: ['peek()(uint256,bool)'],
    returns: [['PRICE_FEED_ETH_PRICE', fromWei], ['PRICE_FEED_ETH_SET']]
  }
];

export const mockedResults = [
  '0x' +
    toWords(
      123456789,
      64,
      2,
      64,
      128,
      32,
      toWei('1111.22223333'),
      32,
      toWei('4444.55556666')
    ),
  '0x' +
    toWords(
      987654321,
      64,
      3,
      96,
      160,
      224,
      32,
      toWei('1111.22223333'),
      32,
      toWei('4444.55556666'),
      64,
      toWei('1234.56789'),
      1
    )
];

export function promiseWait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
