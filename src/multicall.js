import {
  strip0x,
  typesLength,
  padLeft,
  ethCall,
  encodeParameter,
  encodeParameters,
  decodeParameter,
  decodeParameters
} from './helpers.js';
import config from './config.json';
import { keccak256 } from 'js-sha3';

export default class MultiCall {
  constructor(preset, { block = 'latest' } = {}) {
    this.config = {};
    Object.assign(this.config, config.presets[preset]);
    const _block =
      block === 'latest' ? 'latest' : '0x' + Number(block).toString(16);
    Object.assign(this.config, { block: _block });
  }

  _makeMulticallData(calls, keepAsArray) {
    let totalReturnsLength = 0;
    const components = calls.reduce((acc, { to, method, args, returns }) => {
      const returnsLength = typesLength(returns.map(r => r[1]));
      totalReturnsLength += returnsLength;
      if (!args) args = [];
      return acc.concat(
        [
          encodeParameter('address', to),
          padLeft(returnsLength, 64),
          padLeft('40', 64),
          padLeft((args.length * 32 + 4).toString(16), 64),
          '0x' + keccak256(method).substr(0, 8),
          encodeParameters(args.map(a => a[1]), args.map(a => a[0]))
        ]
          .map(v => (v ? strip0x(v) : null))
          .filter(v => v)
      );
    }, []);
    components.unshift(strip0x(padLeft(totalReturnsLength, 64)));
    return keepAsArray ? components : '0x' + components.join('');
  }

  async aggregate(calls) {
    const calldata = this._makeMulticallData(calls, false);
    const result = await ethCall(calldata, this.config);
    const blockNumber = decodeParameter(
      'uint256',
      result.slice(0, 66)
    )[0].toString();
    const typeArray = calls
      .map(ele => ele.returns.map(ele => ele[1]))
      .reduce((acc, ele) => acc.concat(ele), []);
    const retNameArray = calls
      .map(ele => ele.returns.map(ele => ele[0]))
      .reduce((acc, ele) => acc.concat(ele), []);
    const parsedVals = decodeParameters(typeArray, '0x' + result.slice(67)).map(
      ele => {
        if (ele.toString() === 'true') return true;
        if (ele.toString() === 'false') return false;
        return ele.toString();
      }
    );
    const retObj = { blockNumber };
    for (let i = 0; i < retNameArray.length; i++) {
      retObj[retNameArray[i]] = parsedVals[i];
    }
    return retObj;
  }
}
