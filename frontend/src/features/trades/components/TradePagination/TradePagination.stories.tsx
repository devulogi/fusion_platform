import type { Meta, StoryObj } from '@storybook/react';
import TradePagination from './index';

const meta = {
  title: 'Trade History/TradePagination',
  component: TradePagination,
  args: {
    pageIndex: 0,
    pageSize: 100,
    totalItems: 140,
    onPageChange: () => undefined,
  },
} satisfies Meta<typeof TradePagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {};

export const LastPage: Story = {
  args: { pageIndex: 1 },
};

export const Empty: Story = {
  args: { totalItems: 0 },
};
