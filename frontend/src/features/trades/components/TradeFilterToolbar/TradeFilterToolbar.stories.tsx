import type { Meta, StoryObj } from '@storybook/react';
import TradeFilterToolbar from './index';
import { emptyAdvancedTradeFilters } from './types';

const meta = {
  title: 'Trade History/TradeFilterToolbar',
  component: TradeFilterToolbar,
  args: {
    symbol: '',
    filters: emptyAdvancedTradeFilters,
    activeFilterCount: 0,
    onSymbolChange: () => undefined,
    onApply: () => undefined,
  },
} satisfies Meta<typeof TradeFilterToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ActiveFilters: Story = {
  args: {
    symbol: 'AAPL',
    filters: {
      trader: 'JSMITH',
      startDate: '2026-10-01',
      endDate: '2026-10-18',
      sides: ['BUY'],
      statuses: ['ACTIVE'],
    },
    activeFilterCount: 4,
    defaultOpen: true,
  },
};
