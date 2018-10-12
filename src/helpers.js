import Web3 from 'web3';
const { fromWei } = Web3.utils;
import 'isomorphic-fetch';

export const AGGREGATE_SELECTOR = '0x9af53fc6';

export function strip0x(str) {
  return str.replace(/^0x/, '');
}

export function typesLength(types) {
  return types.length;
}

export function parseUnit(unit, val) {
  if (unit !== undefined) {
    if (unit === 'WAD') return fromWei(val, 'ether');
    if (unit === 'RAY') return fromWei(val, 'gether');
  }
  return val;
}

export function padLeft(string, chars, sign) {
  var hasPrefix = /^0x/i.test(string) || typeof string === 'number';
  string = string.toString(16).replace(/^0x/i, '');
  var padding = chars - string.length + 1 >= 0 ? chars - string.length + 1 : 0;
  return (
    (hasPrefix ? '0x' : '') +
    new Array(padding).join(sign ? sign : '0') +
    string
  );
}

export function padRight(string, chars, sign) {
  var hasPrefix = /^0x/i.test(string) || typeof string === 'number';
  string = string.toString(16).replace(/^0x/i, '');
  var padding = chars - string.length + 1 >= 0 ? chars - string.length + 1 : 0;
  return (
    (hasPrefix ? '0x' : '') +
    string +
    new Array(padding).join(sign ? sign : '0')
  );
}

export function numberToHex(value) {
  if (_.isNull(value) || _.isUndefined(value)) return value;
  if (!isFinite(value) && !isHexStrict(value))
    throw new Error('Given input "' + value + '" is not a number.');
  var number = toBN(value);
  var result = number.toString(16);
  return number.lt(new BN(0)) ? '-0x' + result.substr(1) : '0x' + result;
}

function formatInputBytes(rawData) {
  const bytesLength = padLeft((rawData.length / 2).toString(16), 64);
  const location = padLeft('20', 64);
  let result = location + bytesLength + rawData;
  var l = Math.floor((result.length + 63) / 64);
  result = padRight(result, l * 64);
  return AGGREGATE_SELECTOR + result;
}

export async function ethCall(rawData, config) {
  const abiEncodedData = formatInputBytes(rawData.substring(2));
  const rawResponse = await fetch(config.rpcNode, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: config.multicallContractAddress,
          data: abiEncodedData
        },
        'latest'
      ],
      id: 1
    })
  });
  const content = await rawResponse.json();
  return '0x' + content.result.slice(130);
}
