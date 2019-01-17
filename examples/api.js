import { createWatcher } from '../src';
import BigNumber from 'bignumber.js';

const MKR_TOKEN = '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD';
const MKR_WHALE = '0xdb33dfd3d61308c33c63209845dad3e6bfb2c674';
const MKR_FISH = '0x2dfcedcb401557354d0cf174876ab17bfd6f4efd';

const config = {
  rpcNode: 'https://kovan.infura.io',
  multicallAddress: '0xb2155b4f516a2e93fd0c40fdba57a3ab39952236',
  block: 'latest'
};

function fromWei(value) {
  return BigNumber(value)
    .shiftedBy(-18)
    .toFixed();
}

(async () => {
  const watcher = createWatcher(
    [
      {
        target: MKR_TOKEN,
        call: ['balanceOf(address)(uint256)', MKR_WHALE],
        returns: [['BALACE_OF', fromWei]]
      }
    ],
    config
  );

  watcher.subscribe(events => {
    console.log(events, 'events');
  });

  watcher.batchStateDiffs().subscribe(events => {
    console.log(events, 'events batched');
  });

  watcher.startWatch();

  await watcher.awaitInitialFetch();

  console.log('fetched');

  // add calls to the model
  setTimeout(() => {
    watcher.tap(model =>
      model.concat([
        ...model,
        {
          target: MKR_TOKEN,
          call: ['balanceOf(address)(uint256)', MKR_FISH],
          returns: [['BALACE_OF', fromWei]]
        }
      ])
    );
  }, 5000);
})();

(async () => {
  await new Promise(res => {
    setTimeout(res, 10000000);
  });
})();
