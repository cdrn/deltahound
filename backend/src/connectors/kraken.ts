import axios from 'axios';
import { VenueConnector, Orderbook, PriceData, OrderbookEntry } from '../types';

export class KrakenConnector implements VenueConnector {
  public readonly name = 'Kraken';
  private readonly baseUrl = 'https://api.kraken.com/0/public';
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  isConnected(): boolean {
    return true;
  }

  private formatSymbol(baseSymbol: string, quoteSymbol: string): string {
    const symbolMap: { [key: string]: string } = {
      'ETH': 'XETH',
      'BTC': 'XXBT',
      'USDT': 'USDT',
      'USDC': 'USDC',
      'PYUSD': 'PYUSD'
    };

    const base = symbolMap[baseSymbol.toUpperCase()] || baseSymbol.toUpperCase();
    const quote = symbolMap[quoteSymbol.toUpperCase()] || quoteSymbol.toUpperCase();
    
    return `${base}${quote}`;
  }

  async getOrderbook(baseSymbol: string, quoteSymbol: string): Promise<Orderbook> {
    const symbol = this.formatSymbol(baseSymbol, quoteSymbol);
    
    try {
      const response = await axios.get(`${this.baseUrl}/Depth`, {
        params: {
          pair: symbol,
          count: 20
        }
      });

      const data = response.data;
      
      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`);
      }

      const pairData = data.result[Object.keys(data.result)[0]];
      
      const bids: OrderbookEntry[] = pairData.bids.map(([price, quantity]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity)
      }));

      const asks: OrderbookEntry[] = pairData.asks.map(([price, quantity]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity)
      }));

      return {
        bids,
        asks,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to fetch Kraken orderbook for ${symbol}: ${error}`);
    }
  }

  async getPriceData(baseSymbol: string, quoteSymbol: string): Promise<PriceData> {
    const orderbook = await this.getOrderbook(baseSymbol, quoteSymbol);
    
    if (orderbook.bids.length === 0 || orderbook.asks.length === 0) {
      throw new Error(`No orderbook data available for ${baseSymbol}/${quoteSymbol}`);
    }

    const bestBid = orderbook.bids[0].price;
    const bestAsk = orderbook.asks[0].price;
    const spread = ((bestAsk - bestBid) / bestBid) * 100;

    return {
      venue: this.name,
      pair: `${baseSymbol}/${quoteSymbol}`,
      bid: bestBid,
      ask: bestAsk,
      spread,
      timestamp: orderbook.timestamp
    };
  }
}