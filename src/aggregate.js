import { keccak256 } from 'js-sha3';
import invariant from 'invariant';
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

// regex -----------------------------------
const INSIDE_EVERY_PARENTHESES = /\(.*?\)/g;
const FIRST_CLOSING_PARENTHESES = /^[^)]*\)/;

export function _makeMulticallData(calls, keepAsArray) {
  let totalReturnsLength = 0;
  const components = calls.reduce(
    (acc, { target, method, args, returnTypes }) => {
      const returnsLength = typesLength(returnTypes);
      totalReturnsLength += returnsLength;
      if (!args) args = [];
      return acc.concat(
        [
          encodeParameter('address', target),
          padLeft(returnsLength, 64),
          padLeft('40', 64),
          padLeft((args.length * 32 + 4).toString(16), 64),
          keccak256(method).substr(0, 8),
          encodeParameters(args.map(a => a[1]), args.map(a => a[0]))
        ]
          .map(v => (v ? strip0x(v) : null))
          .filter(v => !!v)
      );
    },
    []
  );
  components.unshift(strip0x(padLeft(totalReturnsLength, 64)));
  return keepAsArray ? components : '0x' + components.join('');
}

export default async function aggregate(calls, config) {
  calls = Array.isArray(calls) ? calls : [calls];

  const keyToArgMap = calls.reduce((acc, { call, returns }) => {
    const [, ...args] = call;
    if (args.length > 0) {
      for (let returnMeta of returns) {
        const [key] = returnMeta;
        acc[key] = args;
      }
    }
    return acc;
  }, {});

  calls = calls.map(({ call, target, returns }) => {
    const [method, ...argValues] = call;
    const [argTypesString, returnTypesString] = method
      .match(INSIDE_EVERY_PARENTHESES)
      .map(match => match.slice(1, -1));
    const argTypes = argTypesString.split(',').filter(e => !!e);
    invariant(
      argTypes.length === argValues.length,
      `Every method argument must have exactly one type.
          Comparing argument types ${JSON.stringify(argTypes)}
          to argument values ${JSON.stringify(argValues)}.
        `
    );
    const args = argValues.map((argValue, idx) => [argValue, argTypes[idx]]);
    const returnTypes = !!returnTypesString ? returnTypesString.split(',') : [];
    return {
      method: method.match(FIRST_CLOSING_PARENTHESES)[0],
      args,
      returnTypes,
      target,
      returns
    };
  });

  const callDataBytes = _makeMulticallData(calls, false);
  const result = await ethCall(callDataBytes, config);
  const blockNumber = decodeParameter(
    'uint256',
    result.slice(0, 66)
  )[0].toNumber();
  const returnTypeArray = calls
    .map(({ returnTypes }) => returnTypes)
    .reduce((acc, ele) => acc.concat(ele), []);
  const returnDataMeta = calls
    .map(({ returns }) => returns)
    .reduce((acc, ele) => acc.concat(ele), []);

  invariant(
    returnTypeArray.length === returnDataMeta.length,
    'Missing data needed to parse results'
  );

  const parsedVals = decodeParameters(
    returnTypeArray,
    '0x' + result.slice(67)
  ).map(type => {
    if (type.toString() === 'true') return true;
    if (type.toString() === 'false') return false;
    return type.toString();
  });

  const retObj = { blockNumber };

  if (config.returnUnfiltered) {
    const retObjUnfiltered = { blockNumber };
    for (let i = 0; i < parsedVals.length; i++) {
      const [name, transform] = returnDataMeta[i];
      retObj[name] =
        transform !== undefined ? transform(parsedVals[i]) : parsedVals[i];
      retObjUnfiltered[name] = parsedVals[i];
    }
    return [retObj, retObjUnfiltered];
  }

  for (let i = 0; i < parsedVals.length; i++) {
    const [name, transform] = returnDataMeta[i];
    retObj[name] =
      transform !== undefined ? transform(parsedVals[i]) : parsedVals[i];
  }

  return { results: retObj, keyToArgMap };
}
