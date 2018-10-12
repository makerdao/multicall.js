import Web3 from 'web3';
import flatten from 'lodash.flatten';
import { strip0x, typesLength, parseUnit, ethCall } from './helpers.js';
import config from './config.json';

const { padLeft, numberToHex } = Web3.utils;

export default class MultiCall {
  constructor(preset) {
    this.config = {};
    Object.assign(this.config, config.presets[preset]);
    this.config.multicallContractAbi = [];
    Object.assign(
      this.config.multicallContractAbi,
      config.multicallContractAbi
    );
    this.web3 = new Web3(this.config.rpcNode);
    this.contract = new this.web3.eth.Contract(
      this.config.multicallContractAbi,
      this.config.multicallContractAddress
    );
  }

  makeMulticallData(calls, keepAsArray) {
    let totalReturnsLength = 0;
    const components = calls.reduce((acc, { to, method, args, returns }) => {
      const returnsLength = typesLength(returns.map(r => r[1]));
      totalReturnsLength += returnsLength;
      if (!args) args = [];
      return acc.concat(
        [
          this.web3.eth.abi.encodeParameter('address', to),
          padLeft(returnsLength, 64),
          padLeft('40', 64),
          padLeft(numberToHex(args.length * 32 + 4), 64),
          this.web3.eth.abi.encodeFunctionSignature(method),
          this.web3.eth.abi.encodeParameters(
            args.map(a => a[1]),
            args.map(a => a[0])
          )
        ]
          .map(v => (v ? strip0x(v) : null))
          .filter(v => v)
      );
    }, []);

    components.unshift(strip0x(padLeft(totalReturnsLength, 64)));
    return keepAsArray ? components : '0x' + components.join('');
  }

  async aggregate(calls) {
    const calldata = this.makeMulticallData(calls, false, this.web3.eth);
    const result = await ethCall(calldata, this.config);
    const blockNumber = this.web3.eth.abi.decodeParameter(
      'uint256',
      result.slice(0, 66)
    );
    const typeArray = flatten(calls.map(ele => ele.returns)).map(ele => ele[1]);
    const retNameArray = flatten(calls.map(ele => ele.returns)).map(
      ele => ele[0]
    );
    const units = flatten(calls.map(ele => ele.returns)).map(ele => ele[2]);
    const parsedVals = this.web3.eth.abi.decodeParameters(
      typeArray,
      '0x' + result.slice(67)
    );
    const retObj = { blockNumber };
    for (let i = 0; i < retNameArray.length; i++) {
      retObj[retNameArray[i]] = parseUnit(units[i], parsedVals[i]);
    }
    return retObj;
  }
}
