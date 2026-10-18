import type { Meta, StoryObj } from '@storybook/react';
import TradeStatusBadge from './index';

const meta = {
  title: 'Trade History/TradeStatusBadge',
  component: TradeStatusBadge,
  args: { status: 'ACTIVE' },
} satisfies Meta<typeof TradeStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { status: 'ACTIVE' } };

export const Cancelled: Story = { args: { status: 'CANCELLED' } };
