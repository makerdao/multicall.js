import { createWatcher } from '../src';

const MKR_TOKEN = '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd';
const MKR_WHALE = '0xdb33dfd3d61308c33c63209845dad3e6bfb2c674';
const MKR_FISH = '0x2dfcedcb401557354d0cf174876ab17bfd6f4efd';

// Preset can be 'mainnet', 'kovan', 'rinkeby' or 'goerli'
const config = { preset: 'kovan' };

// Alternatively the rpcUrl and multicallAddress can be specified
// const config = {
//   rpcUrl: 'https://kovan.infura.io',
//   multicallAddress: '0xc49ab4d7de648a97592ed3d18720e00356b4a806'
// };

(async () => {
  const watcher = createWatcher(
    [
      {
        target: MKR_TOKEN,
        call: ['balanceOf(address)(uint256)', MKR_WHALE],
        returns: [['BALANCE_OF_MKR_WHALE', val => val / 10 ** 18]]
      }
    ],
    config
  );

  watcher.subscribe(update => {
    console.log(`Update: ${update.type} = ${update.value}`);
  });

  watcher.batch().subscribe(updates => {
    // Handle batched updates here
  });

  watcher.onNewBlock(blockNumber => {
    console.log(`New block: ${blockNumber}`);
  });

  watcher.start();

  await watcher.awaitInitialFetch();

  console.log('Initial fetch completed');

  // Update the calls
  setTimeout(() => {
    console.log('Updating calls...');
    const fetchWaiter = watcher.tap(calls => [
      ...calls,
      {
        target: MKR_TOKEN,
        call: ['balanceOf(address)(uint256)', MKR_FISH],
        returns: [['BALANCE_OF_MKR_FISH', val => val / 10 ** 18]]
      }
    ]);
    fetchWaiter.then(() => {
      console.log('Initial fetch completed');
    });
  }, 5000);

  // Recreate watcher (useful if network has changed)
  setTimeout(() => {
    console.log('Recreating with new calls and config...');
    const fetchWaiter = watcher.recreate(
      [
        {
          target: MKR_TOKEN,
          call: ['balanceOf(address)(uint256)', MKR_WHALE],
          returns: [['BALANCE_OF_MKR_WHALE', val => val / 10 ** 18]]
        }
      ],
      config
    );
    fetchWaiter.then(() => {
      console.log('Initial fetch completed');
    });
  }, 10000);

  // When subscribing to state updates, previously cached values will be returned immediately
  setTimeout(() => {
    console.log('Subscribing to updates much later (will immediately return cached values)');
    watcher.subscribe(update => {
      console.log(`Update (2nd subscription): ${update.type} = ${update.value}`);
    });
    watcher.onNewBlock(blockNumber => {
      console.log(`New block (2nd subscription): ${blockNumber}`);
    });
  }, 15000);

})();

(async () => {
  await new Promise(res => {
    setTimeout(res, 10000000);
  });
})();
