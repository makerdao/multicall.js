import { createWatcher } from '../src';
import { calls, results } from './shared';

describe('http', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  test('requests using http endpoint', async () => {
    const config = {
      rpcUrl: 'http://localhost:1234',
      multicallAddress: '0x1234567890123456789012345678901234567890'
    };

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: results[0] })
    }));

    const watcher = createWatcher([calls[0], calls[1], calls[2]], config);

    let ethWhaleBalance, mkrWhaleBalance, priceFeedEthPrice;
    watcher.subscribe(update => {
      if (update.type === 'BALANCE_OF_ETH_WHALE') ethWhaleBalance = update.value;
      else if (update.type === 'BALANCE_OF_MKR_WHALE') mkrWhaleBalance = update.value;
      else if (update.type === 'PRICE_FEED_ETH_PRICE') priceFeedEthPrice = update.value;
    });

    let blockNumber;
    watcher.onNewBlock(number => (blockNumber = number));

    watcher.start();
    await watcher.awaitInitialFetch();

    expect(ethWhaleBalance).toEqual('1111.22223333');
    expect(mkrWhaleBalance).toEqual('4444.55556666');
    expect(blockNumber).toEqual(123456789);

    fetch.mockResponse(async () => ({
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: results[1] })
    }));

    await watcher.tap(existing => [...existing, calls[3]]);

    expect(priceFeedEthPrice).toEqual('1234.56789');
    expect(blockNumber).toEqual(987654321);
  });
});
