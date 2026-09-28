// ─── Live Session Execution Store ─────────────────────────────────────────────
// Stores transactions confirmed during the current browser session on Arbitrum Sepolia.
// Never populates mock data in LIVE mode.
// Subgraph or historical blockchain indexing across past sessions is not implemented,
// so this store provides an honest ledger of the current session's live activity.

export interface LiveSessionTx {
  hash: string;
  action: string;
  asset: string;
  amount: number;
  status: 'Confirmed' | 'Failed';
  reason?: string;
  time: number;
}

let sessionTxs: LiveSessionTx[] = [];
let snapshot: LiveSessionTx[] = [];
const subscribers = new Set<() => void>();

export function getLiveSessionTxs(): LiveSessionTx[] {
  return snapshot;
}

export function addLiveSessionTx(tx: LiveSessionTx) {
  // Avoid duplicates
  if (sessionTxs.some((t) => t.hash.toLowerCase() === tx.hash.toLowerCase())) {
    return;
  }
  sessionTxs = [tx, ...sessionTxs];
  snapshot = sessionTxs;
  subscribers.forEach((cb) => cb());
}

export function clearLiveSessionTxs() {
  sessionTxs = [];
  snapshot = [];
  subscribers.forEach((cb) => cb());
}

export function subscribeLiveSessionTxs(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
