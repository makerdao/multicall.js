import { createWatcher } from '../src';
import { calls, mockedResults, promiseWait } from './shared';

const config = {
  rpcUrl: 'https://mocked',
  multicallAddress: '0x1234567890123456789012345678901234567890'
};

describe('watcher', () => {
  beforeEach(() => fetch.resetMocks());

  test('schemas set correctly', async () => {
    const watcher = createWatcher([calls[0], calls[1], calls[2]], config);
    expect(watcher.schemas).toEqual([calls[0], calls[1], calls[2]]);
  });

  test('await initial fetch', async () => {
    const results = {};
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.onNewBlock(number => results['BLOCK_NUMBER'] = number);

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    watcher.start();

    expect(results['BLOCK_NUMBER']).toEqual(undefined);
    await watcher.initialFetch;
    expect(results['BLOCK_NUMBER']).toEqual(123456789);
  });

  test('subscription updates (separate and batched)', async () => {
    const results = {};
    const batchedResults = {};
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.subscribe(update => results[update.type] = update.value);
    watcher.batch().subscribe(updates => updates.forEach(update => batchedResults[update.type] = update.value));
    watcher.onNewBlock(number => results['BLOCK_NUMBER'] = number);
    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    await watcher.start();

    expect(results['BALANCE_OF_ETH_WHALE']).toEqual('1111.22223333');
    expect(results['BALANCE_OF_MKR_WHALE']).toEqual('4444.55556666');
    expect(batchedResults['BALANCE_OF_ETH_WHALE']).toEqual('1111.22223333');
    expect(batchedResults['BALANCE_OF_MKR_WHALE']).toEqual('4444.55556666');
    expect(results['BLOCK_NUMBER']).toEqual(123456789);
  });

  test('subscription updates after schema changed', async () => {
    const results = {};
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.subscribe(update => results[update.type] = update.value);
    watcher.onNewBlock(number => results['BLOCK_NUMBER'] = number);
    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    await watcher.start();

    expect(results['BALANCE_OF_ETH_WHALE']).toEqual('1111.22223333');
    expect(results['BALANCE_OF_MKR_WHALE']).toEqual('4444.55556666');
    expect(results['BLOCK_NUMBER']).toEqual(123456789);

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: mockedResults[1] })
    }));
    await watcher.tap(existing => [...existing, calls[2]]);

    expect(results['PRICE_FEED_ETH_PRICE']).toEqual('1234.56789');
    expect(results['BLOCK_NUMBER']).toEqual(987654321);
  });

  test('subscription updates after watcher recreated', async () => {
    const results = {};
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.subscribe(update => results[update.type] = update.value);
    watcher.onNewBlock(number => results['BLOCK_NUMBER'] = number);
    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    await watcher.start();

    expect(results['BALANCE_OF_ETH_WHALE']).toEqual('1111.22223333');
    expect(results['BALANCE_OF_MKR_WHALE']).toEqual('4444.55556666');
    expect(results['BLOCK_NUMBER']).toEqual(123456789);

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: mockedResults[1] })
    }));
    await watcher.recreate([calls[0], calls[1], calls[2]], config);

    expect(results['PRICE_FEED_ETH_PRICE']).toEqual('1234.56789');
    expect(results['BLOCK_NUMBER']).toEqual(987654321);
  });

  test('onError listener', async (done) => {
    const watcher = createWatcher([], config);
    watcher.onError(() => done());
    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    await watcher.start();
  });

  test('onPoll listener', async (done) => {
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.onPoll(({ id, latestBlockNumber }) => {
      if (id === 1) expect(latestBlockNumber).toEqual(null);
      else if (id === 2) {
        expect(latestBlockNumber).toEqual(123456789);
        done();
      }
    });

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: mockedResults[0] })
    }));
    await watcher.start();

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: mockedResults[1] })
    }));
    await watcher.tap(existing => [...existing, calls[2]]);
  });

});
