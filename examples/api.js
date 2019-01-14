import MultiCall from '../src';
import BigNumber from 'bignumber.js';

const MKR_TOKEN = '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD';
const MKR_WHALE = '0xdb33dfd3d61308c33c63209845dad3e6bfb2c674';

const multicall = new MultiCall('kovan');

function fromWei(value) {
  return BigNumber(value)
    .shiftedBy(-18)
    .toFixed();
}

(async () => {
  const state = await multicall.aggregate([
    {
      target: MKR_TOKEN,
      callData: ['balanceOf(address)(uint256)', MKR_WHALE],
      returns: [['BALACE_OF', fromWei]]
    }
  ]);
  console.log(state);
})();
