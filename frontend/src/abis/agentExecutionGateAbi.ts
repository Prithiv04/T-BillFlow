// AgentExecutionGate.sol ABI — derived from IExecutionGate.sol + AgentExecutionGate.sol
// ExecutionRequest struct fields: mandateId, asset, action, amount, target, selector, callData

export const agentExecutionGateAbi = [
  // ── Core execution ──────────────────────────────────
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'req',
        type: 'tuple',
        components: [
          { name: 'mandateId', type: 'bytes32' },
          { name: 'asset',     type: 'address' },
          { name: 'action',    type: 'uint256' },
          { name: 'amount',    type: 'uint256' },
          { name: 'target',    type: 'address' },
          { name: 'selector',  type: 'bytes4'  },
          { name: 'callData',  type: 'bytes'   },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'canExecute',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'req',
        type: 'tuple',
        components: [
          { name: 'mandateId', type: 'bytes32' },
          { name: 'asset',     type: 'address' },
          { name: 'action',    type: 'uint256' },
          { name: 'amount',    type: 'uint256' },
          { name: 'target',    type: 'address' },
          { name: 'selector',  type: 'bytes4'  },
          { name: 'callData',  type: 'bytes'   },
        ],
      },
    ],
    outputs: [
      { name: 'allowed', type: 'bool'  },
      { name: 'reason',  type: 'bytes' },
    ],
  },
  {
    name: 'canExecuteAs',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'req',
        type: 'tuple',
        components: [
          { name: 'mandateId', type: 'bytes32' },
          { name: 'asset',     type: 'address' },
          { name: 'action',    type: 'uint256' },
          { name: 'amount',    type: 'uint256' },
          { name: 'target',    type: 'address' },
          { name: 'selector',  type: 'bytes4'  },
          { name: 'callData',  type: 'bytes'   },
        ],
      },
      { name: 'agent', type: 'address' },
    ],
    outputs: [
      { name: 'allowed', type: 'bool'  },
      { name: 'reason',  type: 'bytes' },
    ],
  },
  {
    name: 'checkExecution',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'req',
        type: 'tuple',
        components: [
          { name: 'mandateId', type: 'bytes32' },
          { name: 'asset',     type: 'address' },
          { name: 'action',    type: 'uint256' },
          { name: 'amount',    type: 'uint256' },
          { name: 'target',    type: 'address' },
          { name: 'selector',  type: 'bytes4'  },
          { name: 'callData',  type: 'bytes'   },
        ],
      },
      { name: 'caller', type: 'address' },
    ],
    outputs: [],
  },
  // ── Admin / view ─────────────────────────────────────
  {
    name: 'isSelectorAllowed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'target',   type: 'address' },
      { name: 'selector', type: 'bytes4'  },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'mandateRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'rwaOracle',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── Events ────────────────────────────────────────────
  {
    name: 'Executed',
    type: 'event',
    inputs: [
      { name: 'mandateId', type: 'bytes32', indexed: true },
      { name: 'agent',     type: 'address', indexed: true },
      { name: 'target',    type: 'address', indexed: true },
      { name: 'selector',  type: 'bytes4',  indexed: false },
      { name: 'asset',     type: 'address', indexed: false },
      { name: 'action',    type: 'uint256', indexed: false },
      { name: 'amount',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ExecutionBlocked',
    type: 'event',
    inputs: [
      { name: 'mandateId', type: 'bytes32', indexed: true },
      { name: 'agent',     type: 'address', indexed: true },
      { name: 'reason',    type: 'bytes',   indexed: false },
    ],
  },
] as const;
