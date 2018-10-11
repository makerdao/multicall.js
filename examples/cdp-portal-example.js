import MultiCall from '../src';
const multicall = new MultiCall('kovan');

// Mainnet
// const SAI_TOP = '0x9b0ccf7c8994e19f39b2b4cf708e0a7df65fa8a3';
// const SAI_TUB = '0x448a5065aebb8e423f0896e6c5d525c040f59af3';
// const PROXY_REGISTRY = '0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4';
// const HELPER_CONTRACT = '0xfd536f5bc03ed27a240b3f80da898c9e4c33e7b1';
// const MY_ADDRESS = '0x50104b8859824ef71413d2f9d84eea99c199cd12';

// Kovan
const SAI_TOP = '0x5f00393547561da3030ebf30e52f5dc0d5d3362c';
const SAI_TUB = '0xa71937147b55Deb8a530C7229C442Fd3F31b7db2';
const PROXY_REGISTRY = '0x64a436ae831c1672ae81f674cab8b6775df3475c';
const HELPER_CONTRACT = '0x5b630ba8fe98ebed5381c868cd6b8d23875b6ca7';
const MY_ADDRESS = '0x72776bb917751225d24c07d0663b3780b2ada67c';

async function go() {
  let addresses = await getContractAddresses();
  addresses.tub = SAI_TUB;
  console.log('addresses:', addresses);
  const params = await getSaiParams(addresses);
  console.log('params:', params);
}

async function getSaiParams(addresses) {
  const getParams = {
    tub: [
      'axe', // Liquidation penalty
      'mat', // Liquidation ratio
      'cap', // Debt ceiling
      'fit', // REF per SKR (just before settlement)
      'tax', // Stability fee
      'fee', // Governance fee
      'chi', // Accumulated Tax Rates
      'rhi', // Accumulated Tax + Fee Rates
      'rho', // Time of last drip
      'gap', // Join-Exit Spread
      'tag', // Abstracted collateral price (ref per skr)
      'per', // Wrapper ratio (gem per skr)
      'off', // Cage flag
      'out' // Post cage exit
    ],
    vox: [
      'par', // Dai Target Price (ref per dai)
      'way', // The holder fee (interest rate)
      'era'
    ],
    tap: [
      'fix', // Cage price
      'gap' // Boom-Bust Spread
    ]
  };
  const options = {
    calls: Object.keys(getParams).reduce((acc, k) => {
      acc.push(
        ...getParams[k].map(f => {
          return {
            to: addresses[k],
            method: `${f}()`,
            returns: [[f, 'uint256']]
          };
        })
      );
      return acc;
    }, [])
  };
  options.calls.push(
    // eth balance
    {
      to: HELPER_CONTRACT,
      method: `ethBalanceOf(address)`,
      returns: [['eth.myBalance', 'uint256', 'WAD']]
    },
    // pip and pep
    {
      to: addresses.pip,
      method: `peek()`,
      returns: [['pip.val', 'uint256', 'WAD'], ['pip.has', 'bool']]
    },
    {
      to: addresses.pep,
      method: `peek()`,
      returns: [['pep.val', 'uint256', 'WAD'], ['pep.has', 'bool']]
    },
    // gem token
    {
      to: addresses.gem,
      method: `totalSupply()`,
      returns: [['gem.totalSupply', 'uint256', 'WAD']]
    },
    {
      to: addresses.gem,
      method: `balanceOf(address)`,
      args: [[MY_ADDRESS, 'address']],
      returns: [['gem.myBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.gem,
      method: `balanceOf(address)`,
      args: [[addresses.tub, 'address']],
      returns: [['gem.tubBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.gem,
      method: `balanceOf(address)`,
      args: [[addresses.tap, 'address']],
      returns: [['gem.tapBalance', 'uint256', 'WAD']]
    },
    // gov token
    {
      to: addresses.gov,
      method: `totalSupply()`,
      returns: [['gov.totalSupply', 'uint256', 'WAD']]
    },
    {
      to: addresses.gov,
      method: `balanceOf(address)`,
      args: [[MY_ADDRESS, 'address']],
      returns: [['gov.myBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.gov,
      method: `balanceOf(address)`,
      args: [[addresses.pit, 'address']],
      returns: [['gov.pitBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.gov,
      method: `allowance(address,address)`,
      args: [[MY_ADDRESS, 'address'], [addresses.proxy, 'address']],
      returns: [['gov.allowance', 'uint256', 'WAD']]
    },
    // skr token
    {
      to: addresses.skr,
      method: `totalSupply()`,
      returns: [['skr.totalSupply', 'uint256', 'WAD']]
    },
    {
      to: addresses.skr,
      method: `balanceOf(address)`,
      args: [[MY_ADDRESS, 'address']],
      returns: [['skr.myBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.skr,
      method: `balanceOf(address)`,
      args: [[addresses.tub, 'address']],
      returns: [['skr.tubBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.skr,
      method: `balanceOf(address)`,
      args: [[addresses.tap, 'address']],
      returns: [['skr.tapBalance', 'uint256', 'WAD']]
    },
    // dai token
    {
      to: addresses.sai,
      method: `totalSupply()`,
      returns: [['dai.totalSupply', 'uint256', 'WAD']]
    },
    {
      to: addresses.sai,
      method: `balanceOf(address)`,
      args: [[MY_ADDRESS, 'address']],
      returns: [['dai.myBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.sai,
      method: `balanceOf(address)`,
      args: [[addresses.tap, 'address']],
      returns: [['dai.tapBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.sai,
      method: `allowance(address,address)`,
      args: [[MY_ADDRESS, 'address'], [addresses.proxy, 'address']],
      returns: [['dai.allowance', 'uint256', 'WAD']]
    },
    // sin token
    {
      to: addresses.sin,
      method: `totalSupply()`,
      returns: [['sin.totalSupply', 'uint256', 'WAD']]
    },
    {
      to: addresses.sin,
      method: `balanceOf(address)`,
      args: [[addresses.tub, 'address']],
      returns: [['sin.tubBalance', 'uint256', 'WAD']]
    },
    {
      to: addresses.sin,
      method: `balanceOf(address)`,
      args: [[addresses.tap, 'address']],
      returns: [['sin.tapBalance', 'uint256', 'WAD']]
    }
  );
  const results = await multicall.multicall(options);
  return results;
}

async function getContractAddresses() {
  const getContractAddressesFromTub = [
    'tap',
    'vox',
    'pit',
    'pip',
    'pep',
    'gem',
    'gov',
    'skr',
    'sai',
    'sin'
  ];
  const options = {
    calls: getContractAddressesFromTub.map(f => {
      return {
        to: SAI_TUB,
        method: `${f}()`,
        returns: [[f, 'address']]
      };
    })
  };
  options.calls.push({
    to: PROXY_REGISTRY,
    method: `proxies(address)`,
    args: [[MY_ADDRESS, 'address']],
    returns: [['proxy', 'address']]
  });
  const results = await multicall.multicall(options);
  return results;
}

go();
