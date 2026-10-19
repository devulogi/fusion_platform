import type { Meta, StoryObj } from '@storybook/react';
import TradeConnectionStatus from './index';

const meta = {
  title: 'Trade History/TradeConnectionStatus',
  component: TradeConnectionStatus,
  args: { status: 'Live' },
} satisfies Meta<typeof TradeConnectionStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Connecting: Story = { args: { status: 'Connecting' } };
export const Live: Story = { args: { status: 'Live' } };
export const Reconnecting: Story = { args: { status: 'Reconnecting' } };
