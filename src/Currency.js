const tokens = {
  DAI: 'DAI',
  MKR: 'MKR',
  WETH: 'WETH',
  PETH: 'PETH',
  ETH: 'ETH',
  REP: 'REP'
};

// TODO: Do we really need to use lodash?
import values from 'lodash.values';
import BigNumber from 'bignumber.js';

function amountToBigNumber(amount) {
  if (amount instanceof Currency) return amount.toBigNumber();
  const value = BigNumber(amount);
  if (value.lt(0)) throw new Error('amount cannot be negative');
  if (value.isNaN()) throw new Error(`amount "${amount}" is not a number`);
  return value;
}

export class Currency {
  constructor(amount, shift = 0) {
    if (shift === 'wei') shift = -18;
    if (shift === 'ray') shift = -27;
    this._amount = shift
      ? amountToBigNumber(amount).shiftedBy(shift)
      : amountToBigNumber(amount);
    this.symbol = '???';
  }

  isEqual(other) {
    return this._amount.eq(other._amount) && this.symbol == other.symbol;
  }

  toString(decimals = 2) {
    return `${this._amount.toFixed(decimals)} ${this.symbol}`;
  }

  toBigNumber() {
    return this._amount;
  }

  toNumber() {
    return this._amount.toNumber();
  }

  isSameType(other) {
    return this.symbol === other.symbol;
  }
}

const mathFunctions = [
  ['plus'],
  ['minus'],
  ['times', 'multipliedBy'],
  ['div', 'dividedBy'],
  ['shiftedBy']
];

const booleanFunctions = [
  ['isLessThan', 'lt'],
  ['isLessThanOrEqualTo', 'lte'],
  ['isGreaterThan', 'gt'],
  ['isGreaterThanOrEqualTo', 'gte'],
  ['eq']
];

function assertValidOperation(method, left, right) {
  const message = `Invalid operation: ${left.symbol} ${method} ${right.symbol}`;

  if (!(right instanceof Currency) || left.isSameType(right)) return;

  if (right instanceof CurrencyRatio) {
    // only supporting Currency as a left operand for now, though we could
    // extend this to support ratio-ratio math if needed
    switch (method) {
      case 'times':
        if (left.isSameType(right.denominator)) return;
        break;
      case 'div':
        if (left.isSameType(right.numerator)) return;
        break;
    }
  }

  switch (method) {
    // division between two different units results in a ratio, e.g. USD/DAI
    case 'div':
      return;
  }

  throw new Error(message);
}

function result(method, left, right, value) {
  if (right instanceof CurrencyRatio) {
    switch (method) {
      case 'times':
        return new right.numerator(value);
      case 'div':
        return new right.denominator(value);
    }
  }

  if (!(right instanceof Currency) || left.isSameType(right)) {
    return new left.constructor(value);
  }

  return new CurrencyRatio(value, left.constructor, right.constructor);
}

function bigNumberFnWrapper(method, isBoolean) {
  return function(other) {
    assertValidOperation(method, this, other);

    const otherBigNumber =
      other instanceof Currency ? other.toBigNumber() : other;

    const value = this.toBigNumber()[method](otherBigNumber);
    return isBoolean ? value : result(method, this, other, value);
  };
}

Object.assign(
  Currency.prototype,
  mathFunctions.reduce((output, [method, ...aliases]) => {
    output[method] = bigNumberFnWrapper(method);
    for (let alias of aliases) {
      output[alias] = output[method];
    }
    return output;
  }, {}),
  booleanFunctions.reduce((output, [method, ...aliases]) => {
    output[method] = bigNumberFnWrapper(method, true);
    for (let alias of aliases) {
      output[alias] = output[method];
    }
    return output;
  }, {})
);

const makeCreatorFnWithShift = (creatorFn, symbol, shift) => {
  const fn = amount => creatorFn(amount, shift);
  // these two properties are used by getCurrency
  fn.symbol = symbol;
  fn.shift = shift;
  return fn;
};

export function createCurrency(symbol) {
  class CurrencyX extends Currency {
    constructor(amount, shift) {
      super(amount, shift);
      this.symbol = symbol;
    }
  }

  // this changes the name of the class in stack traces
  Object.defineProperty(CurrencyX, 'name', { value: symbol });
  Object.defineProperty(CurrencyX, 'symbol', { value: symbol });

  // This provides short syntax, e.g. ETH(6). We need a wrapper function because
  // you can't call an ES6 class consructor without `new`
  const creatorFn = (amount, shift) => new CurrencyX(amount, shift);

  Object.assign(creatorFn, {
    wei: makeCreatorFnWithShift(creatorFn, symbol, 'wei'),
    ray: makeCreatorFnWithShift(creatorFn, symbol, 'ray'),
    symbol,
    isInstance: obj => obj instanceof CurrencyX
  });

  Object.assign(CurrencyX, { wei: creatorFn.wei, ray: creatorFn.ray });
  return creatorFn;
}

export const currencies = values(tokens).reduce(
  (output, symbol) => {
    output[symbol] = createCurrency(symbol);
    return output;
  },
  {
    USD: createCurrency('USD')
  }
);

export function getCurrency(amount, unit) {
  if (amount instanceof Currency) return amount;
  if (!unit) throw new Error('Amount is not a Currency');
  const key = typeof unit === 'string' ? unit.toUpperCase() : unit.symbol;
  const ctor = currencies[key];
  if (!ctor) {
    throw new Error(`Couldn't find currency for "${key}"`);
  }
  return ctor(amount, unit.shift);
}

// FIXME: this is not exactly analogous to Currency above, because all the
// different pairs are instances of the same class rather than subclasses in
// their own right. but for now it works fine, because it's the wrapper
// functions that are used externally anyway. so if we want to be consistent, we
// could either create subclasses for each ratio, or refactor Currency so it
// also just stores its symbol in the instance rather than the subclass.

class CurrencyRatio extends Currency {
  constructor(amount, numerator, denominator, shift) {
    super(amount, shift);
    this.numerator = numerator;
    this.denominator = denominator;
    this.symbol = `${numerator.symbol}/${denominator.symbol}`;
  }
}

const createCurrencyRatio = (wrappedNumerator, wrappedDenominator) => {
  const numerator = wrappedNumerator(0).constructor;
  const denominator = wrappedDenominator(0).constructor;

  const creatorFn = (amount, shift) =>
    new CurrencyRatio(amount, numerator, denominator, shift);

  const symbol = `${numerator.symbol}/${denominator.symbol}`;

  Object.assign(creatorFn, {
    wei: makeCreatorFnWithShift(creatorFn, symbol, 'wei'),
    ray: makeCreatorFnWithShift(creatorFn, symbol, 'ray'),
    symbol,
    isInstance: obj => obj instanceof CurrencyRatio && obj.symbol === symbol
  });

  return creatorFn;
};

// we export both the currencies object and the individual currencies because
// the latter is convenient when you know what you want to use, and the former
// is convenient when you are picking a currency based on a symbol from input

export const DAI = currencies.DAI;
export const ETH = currencies.ETH;
export const MKR = currencies.MKR;
export const PETH = currencies.PETH;
export const WETH = currencies.WETH;
export const USD = currencies.USD;

export const USD_DAI = createCurrencyRatio(USD, DAI);
export const USD_ETH = createCurrencyRatio(USD, ETH);
export const USD_MKR = createCurrencyRatio(USD, MKR);
export const USD_PETH = createCurrencyRatio(USD, PETH);
export const USD_WETH = createCurrencyRatio(USD, WETH);

Object.assign(currencies, {
  USD_DAI,
  USD_ETH,
  USD_MKR,
  USD_PETH,
  USD_WETH
});
