import { mockMandate } from '@/mocks/data';

export function MandateCard() {
  return (
    <div className="card-glass rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Mandate</h2>
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Agent</span>
          <span>{mockMandate.agent}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Allowed Action</span>
          <span>{mockMandate.allowedAction}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Max Tx</span>
          <span>{mockMandate.maxTx}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Max Cumulative</span>
          <span>{mockMandate.maxCumulative}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Used</span>
          <span>{mockMandate.used}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Valid From</span>
          <span>{new Date(mockMandate.validFrom).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Valid Until</span>
          <span>{new Date(mockMandate.validUntil).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Revoked</span>
          <span>{mockMandate.revoked ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );
}
