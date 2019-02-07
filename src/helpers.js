import { defaultAbiCoder } from 'ethers/utils/abi-coder';

export const AGGREGATE_SELECTOR = '0x9af53fc6';

export function strip0x(str) {
  return str.replace(/^0x/, '');
}

export function typesLength(types) {
  return types.length;
}

export function encodeParameter(type, val) {
  return encodeParameters([type], [val]);
}

export function encodeParameters(types, vals) {
  return defaultAbiCoder.encode(types, vals);
}

export function decodeParameter(type, val) {
  return decodeParameters([type], val);
}

export function decodeParameters(types, vals) {
  return defaultAbiCoder.decode(types, '0x' + vals.replace(/0x/i, ''));
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

function formatInputBytes(rawData) {
  const bytesLength = padLeft((rawData.length / 2).toString(16), 64);
  const location = padLeft('20', 64);
  let result = location + bytesLength + rawData;
  var l = Math.floor((result.length + 63) / 64);
  result = padRight(result, l * 64);
  return AGGREGATE_SELECTOR + result;
}

function stripWords(bytes, numWords) {
  return '0x' + strip0x(bytes).substr(64 * numWords);
}

export function isEmpty(obj) {
  if (Array.isArray(obj)) return obj.length === 0;
  return !obj || Object.keys(obj).length === 0;
}

export async function ethCall(rawData, { rpcUrl, block, multicallAddress }) {
  const abiEncodedData = formatInputBytes(strip0x(rawData));
  const rawResponse = await fetch(rpcUrl, {
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
          to: multicallAddress,
          data: abiEncodedData
        },
        block || 'latest'
      ],
      id: 1
    })
  });
  const content = await rawResponse.json();
  return stripWords(content.result, 2);
}
