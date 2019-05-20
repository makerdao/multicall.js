import fetch from 'cross-fetch';
import { defaultAbiCoder } from 'ethers/utils/abi-coder';

// Function signature for: aggregate((address,bytes)[])
export const AGGREGATE_SELECTOR = '0x252dba42';

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

export function isEmpty(obj) {
  if (Array.isArray(obj)) return obj.length === 0;
  return !obj || Object.keys(obj).length === 0;
}

export async function ethCall(rawData, { rpcUrl, block, multicallAddress }) {
  const abiEncodedData = AGGREGATE_SELECTOR + strip0x(rawData);
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
  if (!content || !content.result) {
    throw new Error(
      'Multicall received an empty response. Check your call configuration for errors.'
    );
  }
  return content.result;
}
