import WS from 'jest-websocket-mock';
import { createWatcher } from '../src';
import { calls, mockedResults } from './shared';

const config = {
  rpcUrl: 'wss://mocked',
  multicallAddress: '0x1234567890123456789012345678901234567890'
};

describe('websocket', () => {
  beforeAll(async () => {
    const server = new WS('wss://mocked', { jsonProtocol: true });
    server.on('connection', socket => {
      socket.on('message', data => {
        const json = JSON.parse(data);
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: json.id, result: mockedResults[json.id - 1] }));
      });
    });
  });

  test('requests using websocket endpoint', async () => {
    const results = {};
    const watcher = createWatcher([calls[0], calls[1]], config);
    watcher.subscribe(update => results[update.type] = update.value);
    watcher.onNewBlock(number => results['BLOCK_NUMBER'] = number);

    await watcher.start();

    expect(results['BALANCE_OF_ETH_WHALE']).toEqual('1111.22223333');
    expect(results['BALANCE_OF_MKR_WHALE']).toEqual('4444.55556666');
    expect(results['BLOCK_NUMBER']).toEqual(123456789);

    await watcher.tap(existing => [...existing, calls[2]]);

    expect(results['PRICE_FEED_ETH_PRICE']).toEqual('1234.56789');
    expect(results['BLOCK_NUMBER']).toEqual(987654321);
  });
});
