// AgentMandateRegistry.sol ABI — derived from IAgentMandateRegistry.sol
// Mandate struct: agent, asset, allowedTarget, allowedActionsMask, maxTx, maxCumulative,
//                 used, validFrom, validUntil, nonce, revoked

export const agentMandateRegistryAbi = [
  // ── View functions ──────────────────────────────────────
  {
    name: 'getMandate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'mandateId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'agent',               type: 'address' },
          { name: 'asset',               type: 'address' },
          { name: 'allowedTarget',       type: 'address' },
          { name: 'allowedActionsMask',  type: 'uint256' },
          { name: 'maxTx',               type: 'uint256' },
          { name: 'maxCumulative',       type: 'uint256' },
          { name: 'used',                type: 'uint256' },
          { name: 'validFrom',           type: 'uint256' },
          { name: 'validUntil',          type: 'uint256' },
          { name: 'nonce',               type: 'uint256' },
          { name: 'revoked',             type: 'bool'    },
        ],
      },
    ],
  },
  {
    name: 'mandateOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'mandateId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'ownerNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'DOMAIN_SEPARATOR',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'executionGate',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'GRANT_MANDATE_TYPEHASH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  // ── Write functions (for future use) ────────────────────
  {
    name: 'revokeMandate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mandateId', type: 'bytes32' }],
    outputs: [],
  },
  // ── Events ───────────────────────────────────────────────
  {
    name: 'MandateGranted',
    type: 'event',
    inputs: [
      { name: 'mandateId',          type: 'bytes32', indexed: true  },
      { name: 'owner',              type: 'address', indexed: true  },
      { name: 'agent',              type: 'address', indexed: true  },
      { name: 'asset',              type: 'address', indexed: false },
      { name: 'allowedTarget',      type: 'address', indexed: false },
      { name: 'allowedActionsMask', type: 'uint256', indexed: false },
      { name: 'maxTx',              type: 'uint256', indexed: false },
      { name: 'maxCumulative',      type: 'uint256', indexed: false },
      { name: 'validFrom',          type: 'uint256', indexed: false },
      { name: 'validUntil',         type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MandateUsageUpdated',
    type: 'event',
    inputs: [
      { name: 'mandateId', type: 'bytes32', indexed: true  },
      { name: 'used',      type: 'uint256', indexed: false },
    ],
  },
] as const;
