export interface TradeIntent {
    chainId: 4663
    tokenAddress: `0x${string}`
    symbol: string
    name?: string
    pairAddress?: `0x${string}`
    priceUsd?: string
    liquidityUsd?: number
  }
  
  export interface TradePanelState {
    open: boolean
    intent: TradeIntent | null
  }