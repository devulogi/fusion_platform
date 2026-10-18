import type { Meta, StoryObj } from '@storybook/react';
import TradeRowActions from './index';

const meta = {
  title: 'Trade History/TradeRowActions',
  component: TradeRowActions,
  args: {
    tradeId: 'TRD-100024',
    onAmend: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof TradeRowActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const MenuOpen: Story = {
  args: { defaultOpen: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
