const { createWatcher } = require('../dist/build.cjs.js');
// console.log(createWatcher)

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

  watcher.subscribe(events => {
    console.log(events, 'events');
  });

  watcher.batch().subscribe(events => {
    console.log(events, 'events batched');
  });

  watcher.start();

  await watcher.awaitInitialFetch();

  console.log('initial fetch');

  setTimeout(() => {
    console.log('update model');
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
      console.log('new model fetch');
    });
  }, 5000);

  setTimeout(() => {
    console.log('update config');
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
      console.log('new config fetch');
    });
  }, 10000);
})();

(async () => {
  await new Promise(res => {
    setTimeout(res, 10000000);
  });
})();
