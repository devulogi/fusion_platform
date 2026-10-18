import type { Trade } from '../../trade-schema';
import TradeStatusBadgeView from './TradeStatusBadgeView';

type TradeStatusBadgeProps = {
  status: Trade['status'];
};

export default function TradeStatusBadge({ status }: TradeStatusBadgeProps) {
  const isActive = status === 'ACTIVE';
  return (
    <TradeStatusBadgeView
      label={isActive ? 'Active' : 'Cancelled'}
      tone={isActive ? 'active' : 'cancelled'}
    />
  );
}
