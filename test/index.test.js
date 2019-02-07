import { _makeMulticallData as makeMulticallData } from '../src/aggregate';

test('no args', () => {
  const calls = [
    {
      target: '0xbbf289d846208c16edc8474705c748aff07732db',
      method: 'what()',
      returns: [['foo']],
      returnTypes: ['uint256']
    }
  ];
  const expected = [
    '0000000000000000000000000000000000000000000000000000000000000001',
    '000000000000000000000000bbf289d846208c16edc8474705c748aff07732db',
    '0000000000000000000000000000000000000000000000000000000000000001',
    '0000000000000000000000000000000000000000000000000000000000000040',
    '0000000000000000000000000000000000000000000000000000000000000004',
    'b24bb845'
  ];
  expect(makeMulticallData(calls, true)).toEqual(expected);
});

test('two calls, one with args', () => {
  const calls = [
    {
      target: '0xbeefed1bedded2dabbed3defaced4decade5dead',
      method: 'fess(address)',
      args: [['0xbeefed1bedded2dabbed3defaced4decade5bead', 'address']],
      returnTypes: ['uint256', 'address'],
      returns: [['kay'], ['jewelers']]
    },
    {
      target: '0xbeefed1bedded2dabbed3defaced4decade5face',
      method: 'flog()',
      returns: [['deBeers']],
      returnTypes: ['bytes32'],
    }
  ];
  const actual = makeMulticallData(calls, true);
  const expected = [
    '0000000000000000000000000000000000000000000000000000000000000003', // total returns
    '000000000000000000000000beefed1bedded2dabbed3defaced4decade5dead', // address
    '0000000000000000000000000000000000000000000000000000000000000002', // length of returns (in words)
    '0000000000000000000000000000000000000000000000000000000000000040', //
    '0000000000000000000000000000000000000000000000000000000000000024', // length of method sig + args
    'c963c57b', // method sig
    '000000000000000000000000beefed1bedded2dabbed3defaced4decade5bead', // arg
    '000000000000000000000000beefed1bedded2dabbed3defaced4decade5face', // arg
    '0000000000000000000000000000000000000000000000000000000000000001',
    '0000000000000000000000000000000000000000000000000000000000000040',
    '0000000000000000000000000000000000000000000000000000000000000004',
    'a7c795fa' // method sig
  ];
  expect(actual).toEqual(expected);
});
