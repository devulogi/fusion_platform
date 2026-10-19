import type { Meta, StoryObj } from '@storybook/react';
import TradeBlotterTable from './index';
import type { Trade } from '../../trade-schema';

const trades: Trade[] = [
  {
    id: 'TRD-100021',
    symbol: 'TSLA',
    quantity: 240,
    price: 218.42,
    side: 'BUY',
    trader: 'Olivia Rhye',
    tradeTimestamp: '2026-10-16T10:30:00.000Z',
    status: 'ACTIVE',
    book: 'EQUITIES_US',
    counterparty: 'Morgan Stanley',
  },
  {
    id: 'TRD-100022',
    symbol: 'MCHP',
    quantity: 800,
    price: 82.16,
    side: 'SELL',
    trader: 'Phoenix Baker',
    tradeTimestamp: '2026-10-16T09:18:00.000Z',
    status: 'ACTIVE',
    book: 'TECH_GROWTH',
    counterparty: 'Goldman Sachs',
  },
  {
    id: 'TRD-100023',
    symbol: 'DDOG',
    quantity: 420,
    price: 104.32,
    side: 'BUY',
    trader: 'Lana Steiner',
    tradeTimestamp: '2026-10-15T15:05:00.000Z',
    status: 'ACTIVE',
    book: 'TECH_GROWTH',
    counterparty: 'Citigroup',
  },
  {
    id: 'TRD-100024',
    symbol: 'ARKK',
    quantity: 160,
    price: 22.65,
    side: 'BUY',
    trader: 'Demi Wilkinson',
    tradeTimestamp: '2026-10-15T13:42:00.000Z',
    status: 'CANCELLED',
    book: 'EQUITIES_US',
    counterparty: 'JPMorgan',
  },
];

const meta = {
  title: 'Trade Blotter/TradeBlotterTable',
  component: TradeBlotterTable,
  parameters: { layout: 'fullscreen' },
  args: {
    trades,
    isLoading: false,
    emptyMessage: 'No trades yet',
    actionsDisabled: false,
    symbol: '',
    filters: { trader: '', startDate: '', endDate: '', sides: [], statuses: [] },
    activeFilterCount: 0,
    sortBy: 'tradeTimestamp',
    sortDirection: 'desc',
    pagination: { page: 1, pageSize: 100, totalItems: trades.length, pageCount: 1 },
    onPageChange: () => undefined,
    onSymbolChange: () => undefined,
    onFiltersApply: () => undefined,
    onSortChange: () => undefined,
    onAmend: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof TradeBlotterTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Loading: Story = {
  args: { trades: [], isLoading: true },
};

export const Empty: Story = {
  args: { trades: [], isLoading: false },
};
