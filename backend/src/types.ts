export interface OrderbookEntry {
  price: number;
  quantity: number;
}

export interface Orderbook {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp: number;
}

export interface PriceData {
  venue: string;
  pair: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

export interface ArbitrageOpportunity {
  buyVenue: string;
  sellVenue: string;
  pair: string;
  buyPrice: number;
  sellPrice: number;
  grossProfit: number;
  netProfit: number;
  profitPercent: number;
  timestamp: number;
}

export interface VenueConnector {
  name: string;
  isConnected(): boolean;
  getOrderbook(baseSymbol: string, quoteSymbol: string): Promise<Orderbook>;
  getPriceData(baseSymbol: string, quoteSymbol: string): Promise<PriceData>;
}