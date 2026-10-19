import type { Meta, StoryObj } from '@storybook/react';
import AmendTradeDialog from './index';
import type { Trade } from '../../trade-schema';

const trade: Trade = {
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
};

const meta = {
  title: 'Trade History/AmendTradeDialog',
  component: AmendTradeDialog,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, iframeHeight: '640px' } },
  },
  args: {
    open: true,
    trade,
    isPending: false,
    onClose: () => undefined,
    onSubmit: () => undefined,
  },
} satisfies Meta<typeof AmendTradeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = {
  args: { isPending: true },
};
