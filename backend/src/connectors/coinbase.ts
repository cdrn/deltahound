import axios from 'axios';
import { VenueConnector, Orderbook, PriceData, OrderbookEntry } from '../types';
import { PairMapper } from '../utils/pair-mapper';

export class CoinbaseConnector implements VenueConnector {
  public readonly name = 'Coinbase Pro';
  private readonly baseUrl = 'https://api.exchange.coinbase.com';
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly passphrase?: string;

  constructor(apiKey?: string, apiSecret?: string, passphrase?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  isConnected(): boolean {
    return true;
  }

  private formatSymbol(baseSymbol: string, quoteSymbol: string): string | null {
    const pair = `${baseSymbol}/${quoteSymbol}`;
    return PairMapper.getVenueSymbol(this.name, pair);
  }

  async getOrderbook(baseSymbol: string, quoteSymbol: string): Promise<Orderbook> {
    const symbol = this.formatSymbol(baseSymbol, quoteSymbol);
    
    if (!symbol) {
      throw new Error(`Pair ${baseSymbol}/${quoteSymbol} not supported on Coinbase`);
    }
    
    try {
      const response = await axios.get(`${this.baseUrl}/products/${symbol}/book`, {
        params: {
          level: 2
        }
      });

      const data = response.data;
      
      const bids: OrderbookEntry[] = data.bids.slice(0, 20).map(([price, size]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(size)
      }));

      const asks: OrderbookEntry[] = data.asks.slice(0, 20).map(([price, size]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(size)
      }));

      return {
        bids,
        asks,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to fetch Coinbase orderbook for ${symbol}: ${error}`);
    }
  }

  async getPriceData(baseSymbol: string, quoteSymbol: string): Promise<PriceData> {
    const symbol = this.formatSymbol(baseSymbol, quoteSymbol);
    
    if (!symbol) {
      throw new Error(`Pair ${baseSymbol}/${quoteSymbol} not supported on Coinbase`);
    }
    
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