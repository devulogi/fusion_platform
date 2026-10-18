type TradeStatusBadgeViewProps = {
  label: 'Active' | 'Cancelled';
  tone: 'active' | 'cancelled';
};

export default function TradeStatusBadgeView({ label, tone }: TradeStatusBadgeViewProps) {
  const isActive = tone === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive
          ? 'bg-[var(--trade-active-bg)] text-[var(--trade-active-text)]'
          : 'bg-[var(--trade-cancelled-bg)] text-[var(--trade-cancelled-text)]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#31966a]' : 'bg-[#d25360]'}`}
      />
      {label}
    </span>
  );
}
