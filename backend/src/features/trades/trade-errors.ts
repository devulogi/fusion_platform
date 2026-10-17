export class TradeNotFoundError extends Error {
  constructor(tradeId: string, options?: ErrorOptions) {
    super(`Trade ${tradeId} was not found`, options);
    this.name = 'TradeNotFoundError';
  }
}

export class TradeNotAmendableError extends Error {
  constructor(tradeId: string, options?: ErrorOptions) {
    super(`Trade ${tradeId} cannot be amended`, options);
    this.name = 'TradeNotAmendableError';
  }
}
