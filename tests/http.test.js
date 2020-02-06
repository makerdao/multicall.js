import { createWatcher } from '../src';
import { calls, mockedResults } from './shared';

const config = {
  rpcUrl: 'https://mocked',
  multicallAddress: '0x1234567890123456789012345678901234567890'
};

describe('http', () => {
  beforeEach(() => fetch.resetMocks());

  test('requests using http endpoint', async () => {
    const results = {};
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.subscribe(update => results[update.type] = update.value);
    watcher.onNewBlock(number => results['BLOCK_NUMBER'] = number);

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    await watcher.start();

    expect(results['BALANCE_OF_ETH_WHALE']).toEqual('1111.22223333');
    expect(results['BALANCE_OF_MKR_WHALE']).toEqual('2222.33334444');
    expect(results['BLOCK_NUMBER']).toEqual(123456789);

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: mockedResults[1] })
    }));
    await watcher.tap(existing => [...existing, calls[2]]);

    expect(results['BALANCE_OF_ETH_WHALE']).toEqual('3333.44445555');
    expect(results['BALANCE_OF_MKR_WHALE']).toEqual('4444.55556666');
    expect(results['PRICE_FEED_ETH_PRICE']).toEqual('1234.56789');
    expect(results['BLOCK_NUMBER']).toEqual(987654321);
  });
});
