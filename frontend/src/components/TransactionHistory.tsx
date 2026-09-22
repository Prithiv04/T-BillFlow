import React from 'react';
import { mockTxHistory } from '@/mocks/data';

export function TransactionHistory() {
  return (
    <div className="card-glass rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Transaction History</h2>
      {mockTxHistory.length === 0 ? (
        <p className="text-sm text-gray-400">No transactions yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-700">
            <tr>
              <th className="pb-2">Hash</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {mockTxHistory.map((tx, idx) => (
              <tr key={idx} className="border-b border-gray-800">
                <td className="py-1 text-xs break-all text-gray-300">{tx.hash}</td>
                <td className="py-1 text-gray-300">{tx.status}</td>
                <td className="py-1 text-gray-300">{new Date(tx.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
