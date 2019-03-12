const { createWatcher } = require('../dist/build.cjs.js');

const MKR_TOKEN = '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD';
const MKR_WHALE = '0xdb33dfd3d61308c33c63209845dad3e6bfb2c674';
const MKR_FISH = '0x2dfcedcb401557354d0cf174876ab17bfd6f4efd';

const config = {
  rpcUrl: 'https://kovan.infura.io',
  multicallAddress: '0xb2155b4f516a2e93fd0c40fdba57a3ab39952236'
};

(async () => {
  const watcher = createWatcher(
    [
      {
        target: MKR_TOKEN,
        call: ['balanceOf(address)(uint256)', MKR_WHALE],
        returns: [['BALANCE_OF', val => val / 10 ** 18]]
      }
    ],
    config
  );

  watcher.subscribe(event => {
    console.log('Event:', event);
  });

  watcher.onNewBlock(blockNumber => {
    console.log('New block:', blockNumber);
  });

  watcher.batch().subscribe(events => {
    console.log('Batched events:', events);
  });

  watcher.start();

  await watcher.awaitInitialFetch();

  console.log('Initial fetch completed');

  setTimeout(() => {
    console.log('Updating model');
    const fetchWaiter = watcher.tap(model =>
      model.concat([
        {
          target: MKR_TOKEN,
          call: ['balanceOf(address)(uint256)', MKR_FISH],
          returns: [['BALANCE_OF', val => val / 10 ** 18]]
        }
      ])
    );

    fetchWaiter.then(() => {
      console.log('Initial fetch after updated model completed');
    });
  }, 5000);

  setTimeout(() => {
    console.log('Updating config');
    const fetchWaiter = watcher.reCreate(
      [
        {
          target: MKR_TOKEN,
          call: ['balanceOf(address)(uint256)', MKR_WHALE],
          returns: [['BALANCE_OF', val => val / 10 ** 18]]
        }
      ],
      config
    );

    fetchWaiter.then(() => {
      console.log('Initial fetch after new config completed');
    });
  }, 10000);
})();

(async () => {
  await new Promise(res => {
    setTimeout(res, 10000000);
  });
})();
