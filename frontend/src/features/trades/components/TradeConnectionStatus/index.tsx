import type { ConnectionStatus } from '../../../../contexts/connection-status-context';

type TradeConnectionStatusProps = {
  status: ConnectionStatus;
};

const connectionStatusDotClassName: Record<ConnectionStatus, string> = {
  Connecting: 'bg-[var(--trade-connection-pending)]',
  Live: 'bg-[var(--trade-connection-live)]',
  Reconnecting: 'bg-[var(--trade-connection-pending)]',
};

export default function TradeConnectionStatus({ status }: TradeConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${connectionStatusDotClassName[status]}`}
      />
      <span>{status}</span>
    </div>
  );
}
