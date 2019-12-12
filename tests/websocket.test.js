import WS from 'jest-websocket-mock';
import { createWatcher } from '../src';
import { calls, results } from './shared';

describe('websocket', () => {
  let server;

  beforeAll(async () => {
    server = new WS('ws://localhost:1234', { jsonProtocol: true });
    server.on('connection', socket => {
      socket.on('message', data => {
        const json = JSON.parse(data);
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: json.id, result: results[json.id - 1] }));
      });
    });
  });

  test('requests using websocket endpoint', async () => {
    const config = {
      rpcUrl: 'ws://localhost:1234',
      multicallAddress: '0x1234567890123456789012345678901234567890'
    };
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

    await watcher.tap(existing => [...existing, calls[3]]);

    expect(priceFeedEthPrice).toEqual('1234.56789');
    expect(blockNumber).toEqual(987654321);
  });
});
