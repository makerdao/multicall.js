import MultiCall from '../src';

// Rinkeby contract addresses
const HELPER_CONTRACT = '0xadb7c74bce932fc6c27dda3ac2344707d2fbb0e6';
const AUGUR_MAIN_CONTRACT = '0x990b2d2af7e87cd015a607c3a95d7622c9bbede1';
const AUGUR_CONTROLLER_CONTRACT = '0xa702f45c3b1fd31793a409768bd3a0a91fad32bc';
const AUGUR_UNIVERSE_CONTRACT = '0x02149d40d255fceac54a3ee3899807b0539bad60';
const MY_ADDRESS = '0x6d361b8143ae353d0037fe2a4e2ace76f21c4b75';

const multicall = new MultiCall('rinkeby');

async function go() {
  const options = {
    calls: [{
      to: HELPER_CONTRACT,
      method: `ethBalanceOf(address)`,
      args: [[MY_ADDRESS, 'address']],
      returns: [['eth.myBalance', 'uint256']]
    }, {
      to: AUGUR_MAIN_CONTRACT,
      method: `isKnownUniverse(address)`,
      args: [[AUGUR_UNIVERSE_CONTRACT, 'address']],
      returns: [['augur.isKnownUniverse1', 'bool']]
    }, {
      to: AUGUR_MAIN_CONTRACT,
      method: `isKnownUniverse(address)`,
      args: [['0x1234567890123456789012345678901234567890', 'address']],
      returns: [['augur.isKnownUniverse2', 'bool']]
    }, {
      to: AUGUR_CONTROLLER_CONTRACT,
      method: `getAugur()`,
      returns: [['augur.mainContract', 'address']]
    }]
  };

  const results = await multicall.aggregate(options.calls);
  console.log('multicall result:', results);
}

go();
