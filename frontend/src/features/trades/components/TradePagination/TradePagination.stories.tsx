import type { Meta, StoryObj } from '@storybook/react';
import TradePagination from './index';

const meta = {
  title: 'Trade History/TradePagination',
  component: TradePagination,
  args: {
    page: 1,
    pageSize: 100,
    totalItems: 245,
    pageCount: 3,
    onPageChange: () => undefined,
  },
} satisfies Meta<typeof TradePagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {};

export const FinalPage: Story = {
  args: { page: 3 },
};

export const Empty: Story = {
  args: { page: 1, pageCount: 0, totalItems: 0 },
};
