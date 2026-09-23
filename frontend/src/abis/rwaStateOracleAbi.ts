// RWAStateOracle.sol ABI — derived from IRWAStateOracle.sol + RWAStateOracle.sol
// AssetState struct: nav, navUpdatedAt, redemptionOpen, liquidityTier, supported, maxNavAge

export const rwaStateOracleAbi = [
  // ── State read functions ───────────────────────────────
  {
    name: 'getAssetState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'nav',            type: 'uint256' },
          { name: 'navUpdatedAt',   type: 'uint256' },
          { name: 'redemptionOpen', type: 'bool'    },
          { name: 'liquidityTier',  type: 'uint8'   },
          { name: 'supported',      type: 'bool'    },
          { name: 'maxNavAge',      type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'nav',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isNavFresh',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isRedemptionOpen',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isEligible',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'asset',   type: 'address' },
      { name: 'action',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'minLiquidityTier',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  // ── Events ──────────────────────────────────────────────
  {
    name: 'AssetStateUpdated',
    type: 'event',
    inputs: [
      { name: 'asset',          type: 'address', indexed: true  },
      { name: 'nav',            type: 'uint256', indexed: false },
      { name: 'navUpdatedAt',   type: 'uint256', indexed: false },
      { name: 'redemptionOpen', type: 'bool',    indexed: false },
      { name: 'liquidityTier',  type: 'uint8',   indexed: false },
    ],
  },
] as const;
