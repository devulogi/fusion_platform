import type { Meta, StoryObj } from '@storybook/react';
import CreateTradeDialog from './index';

const meta = {
  title: 'Trade History/CreateTradeDialog',
  component: CreateTradeDialog,
  args: {
    open: true,
    isPending: false,
    onClose: () => undefined,
    onSubmit: () => undefined,
  },
} satisfies Meta<typeof CreateTradeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = {
  args: { isPending: true },
};
