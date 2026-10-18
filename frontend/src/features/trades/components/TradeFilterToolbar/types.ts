import type { Trade } from '../../trade-schema';

export type AdvancedTradeFilters = {
  trader: string;
  startDate: string;
  endDate: string;
  sides: Trade['side'][];
  statuses: Trade['status'][];
};

export const emptyAdvancedTradeFilters: AdvancedTradeFilters = {
  trader: '',
  startDate: '',
  endDate: '',
  sides: [],
  statuses: [],
};
