import { Search } from 'lucide-react';

type SymbolSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SymbolSearch({ value, onChange }: SymbolSearchProps) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center sm:max-w-64">
      <span className="sr-only">Filter by symbol</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-[var(--trade-muted)]"
        size={16}
      />
      <input
        aria-label="Filter by symbol"
        className="min-h-11 w-full rounded-md border border-[var(--trade-border)] bg-white px-3 pl-9 text-sm font-normal text-[var(--trade-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search symbol..."
        type="search"
        value={value}
      />
    </label>
  );
}
