import Web3 from 'web3';
const { fromWei } = Web3.utils;

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
