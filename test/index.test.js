import MultiCall from '../src';
const multicall = new MultiCall('kovan');

test('no args', () => {
  const calls = [
    {
      to: '0xbbf289d846208c16edc8474705c748aff07732db',
      method: 'what()',
      returns: [['foo', 'uint256']]
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
  expect(multicall.makeMulticallData(calls, true)).toEqual(expected);
});

test('two calls, one with args', () => {
  const calls = [
    {
      to: '0xbeefed1bedded2dabbed3defaced4decade5dead',
      method: 'fess(guy)',
      args: [['0xbeefed1bedded2dabbed3defaced4decade5bead', 'address']],
      returns: [['kay', 'uint256'], ['jewelers', 'address']]
    },
    {
      to: '0xbeefed1bedded2dabbed3defaced4decade5face',
      method: 'flog()',
      returns: [['deBeers', 'bytes32']]
    }
  ];
  const actual = multicall.makeMulticallData(calls, true);
  const expected = [
    '0000000000000000000000000000000000000000000000000000000000000003', // total returns

    '000000000000000000000000beefed1bedded2dabbed3defaced4decade5dead', // address
    '0000000000000000000000000000000000000000000000000000000000000002', // length of returns (in words)
    '0000000000000000000000000000000000000000000000000000000000000040', // ?
    '0000000000000000000000000000000000000000000000000000000000000024', // length of method sig + args
    '7db93317',
    '000000000000000000000000beefed1bedded2dabbed3defaced4decade5bead',

    '000000000000000000000000beefed1bedded2dabbed3defaced4decade5face',
    '0000000000000000000000000000000000000000000000000000000000000001',
    '0000000000000000000000000000000000000000000000000000000000000040',
    '0000000000000000000000000000000000000000000000000000000000000004',
    'a7c795fa'
  ];
  expect(actual).toEqual(expected);
});
