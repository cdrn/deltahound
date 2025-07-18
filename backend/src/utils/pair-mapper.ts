export interface VenuePairMapping {
  [venue: string]: {
    [pair: string]: string | null; // null means pair not supported
  };
}

export const VENUE_PAIR_MAPPINGS: VenuePairMapping = {
  'Binance': {
    'ETH/USDT': 'ETHUSDT',
    'ETH/USDC': 'ETHUSDC', 
    'USDC/USDT': 'USDCUSDT',
    'USDT/DAI': 'USDTDAI',
    'BTC/USDT': 'BTCUSDT',
    'BTC/USDC': 'BTCUSDC'
  },
  'Coinbase Pro': {
    'ETH/USDT': 'ETH-USD', // Coinbase uses USD not USDT
    'ETH/USDC': null, // Not supported/delisted
    'USDC/USDT': null, // Not supported
    'USDT/DAI': null, // Not supported
    'BTC/USDT': 'BTC-USD',
    'BTC/USDC': null
  },
  'Kraken': {
    'ETH/USDT': 'XETHZUSD', // Kraken's weird format
    'ETH/USDC': 'ETHUSDC',
    'USDC/USDT': 'USDCUSDT',
    'USDT/DAI': null, // Kraken doesn't have this
    'BTC/USDT': 'XXBTZUSD',
    'BTC/USDC': 'XBTUSDC'
  },
  'Uniswap V3': {
    'ETH/USDT': 'WETH/USDT', // Will map to token addresses
    'ETH/USDC': 'WETH/USDC',
    'USDC/USDT': 'USDC/USDT',
    'USDT/DAI': 'USDT/DAI',
    'BTC/USDT': 'WBTC/USDT',
    'BTC/USDC': 'WBTC/USDC'
  }
};

export class PairMapper {
  static getVenueSymbol(venue: string, pair: string): string | null {
    const venueMapping = VENUE_PAIR_MAPPINGS[venue];
    if (!venueMapping) {
      return null;
    }
    
    return venueMapping[pair] || null;
  }
  
  static isVenuePairSupported(venue: string, pair: string): boolean {
    const symbol = this.getVenueSymbol(venue, pair);
    return symbol !== null;
  }
  
  static getSupportedPairsForVenue(venue: string): string[] {
    const venueMapping = VENUE_PAIR_MAPPINGS[venue];
    if (!venueMapping) {
      return [];
    }
    
    return Object.keys(venueMapping).filter(pair => venueMapping[pair] !== null);
  }
}