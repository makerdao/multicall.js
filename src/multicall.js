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
import { clearTimeout } from 'timers';

export default class MultiCall {
  config = {};
  globals = {};
  templates = {};
  registered = [];
  onUpdateHandlers = [];
  noNewBlockRetryInterval = 1000;
  pollingInterval = 5000;
  pollingHandle = null;
  firstPoll = true;
  latestBlock = null;

  constructor(preset, { block = 'latest' } = {}) {
    Object.assign(this.config, config.presets[preset]);
    const _block = block === 'latest' ? 'latest' : '0x' + Number(block).toString(16);
    Object.assign(this.config, { block: _block });
  }
  onUpdate(cb) {
    this.onUpdateHandlers.push(cb);
  }
  startPolling(interval = this.pollingInterval) {
    if (this.firstPoll === true) {
      interval = 0;
      this.firstPoll = false;
    }
    if (this.pollingHandle !== null) clearTimeout(this.pollingHandle);

    console.log(`Polling with interval ${interval}ms`);
    this.pollingHandle = setTimeout(async () => {
      const results = await this.poll();
      if (results === null) {
        this.startPolling(this.noNewBlockRetryInterval);
        return;
      }
      this.pollingHandle = null;
      this.onUpdateHandlers.forEach(cb => cb(results));
      if (this.pollingHandle === null) this.startPolling();
    }, interval);
  }
  stopPolling() {
    if (this.pollingHandle !== null) clearTimeout(this.pollingHandle);
    this.firstPoll = true;
  }
  async poll() {
    const calls = this.registered.map(call => this.templates[call.name](call.args));
    return await this.aggregate(calls);
  }
  registerTemplate(name, args) {
    this.registered.push({ name, args });
  }
  registerTemplates(templates) {
    templates.forEach(template => this.registerTemplate(template[0], template[1] || undefined));
  }
  createTemplate(name, cb) {
    this.templates[name] = args => cb({ ...this.globals, ...args });
  }
  createTemplates(templates) {
    for (const key of Object.keys(templates)) {
      this.createTemplate(key, templates[key]);
    }
  }
  setGlobal(key, value) {
    this.globals[key] = value;
  }
  setGlobals(fields) {
    this.globals = { ...this.globals, ...fields };
  }
  getGlobal(key) {
    return this.globals[key];
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
    const blockNumber = parseInt(decodeParameter('uint256', result.slice(0, 66))[0].toString());
    if (this.latestBlock !== null && blockNumber <= this.latestBlock) return null;
    this.latestBlock = blockNumber;

    const filterArray = calls
      .map(ele => ele.returns.map(ele => ele[2]))
      .reduce((acc, ele) => acc.concat(ele), []);
    const typeArray = calls
      .map(ele => ele.returns.map(ele => ele[1]))
      .reduce((acc, ele) => acc.concat(ele), []);
    const retNameArray = calls
      .map(ele => ele.returns.map(ele => ele[0]))
      .reduce((acc, ele) => acc.concat(ele), []);
    const parsedVals = decodeParameters(typeArray, '0x' + result.slice(67)).map(ele => {
      if (ele.toString() === 'true') return true;
      if (ele.toString() === 'false') return false;
      return ele.toString();
    });
    const retObj = { blockNumber };
    for (let i = 0; i < retNameArray.length; i++) {
      if (typeof filterArray[i] !== 'undefined')
        retObj[retNameArray[i]] = filterArray[i](parsedVals[i]);
      else retObj[retNameArray[i]] = parsedVals[i];
    }
    return retObj;
  }
}
