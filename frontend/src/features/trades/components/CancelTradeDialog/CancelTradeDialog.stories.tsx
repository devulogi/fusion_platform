import type { Meta, StoryObj } from '@storybook/react';
import CancelTradeDialog from './index';
import type { Trade } from '../../trade-schema';

const trade: Trade = {
  id: 'TRD-100024',
  symbol: 'ARKK',
  quantity: 160,
  price: 22.65,
  side: 'BUY',
  trader: 'Demi Wilkinson',
  tradeTimestamp: '2026-10-15T13:42:00.000Z',
  status: 'ACTIVE',
  book: 'EQUITIES_US',
  counterparty: 'JPMorgan',
};

const meta = {
  title: 'Trade History/CancelTradeDialog',
  component: CancelTradeDialog,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, iframeHeight: '640px' } },
  },
  args: {
    open: true,
    trade,
    isPending: false,
    onClose: () => undefined,
    onConfirm: () => undefined,
  },
} satisfies Meta<typeof CancelTradeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmation: Story = {};

export const Pending: Story = {
  args: { isPending: true },
};
