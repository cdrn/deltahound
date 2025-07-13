import dotenv from 'dotenv';

dotenv.config();

export interface TradingPair {
  baseSymbol: string;
  quoteSymbol: string;
}

export interface VenueConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  rpcUrl?: string;
}

export interface ArbitrageConfig {
  minProfitThreshold: number;
  maxSlippagePercent: number;
  tradingFeePercent: {
    binance: number;
    uniswap: number;
  };
}

export interface Config {
  tradingPairs: TradingPair[];
  venues: {
    binance: VenueConfig;
    uniswap: VenueConfig;
    coinbase: VenueConfig;
    kraken: VenueConfig;
  };
  arbitrage: ArbitrageConfig;
  polling: {
    intervalMs: number;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  tradingPairs: [
    {
      baseSymbol: 'ETH',
      quoteSymbol: 'USDT'
    },
    {
      baseSymbol: 'ETH',
      quoteSymbol: 'USDC'
    },
    {
      baseSymbol: 'USDC',
      quoteSymbol: 'USDT'
    },
    {
      baseSymbol: 'USDT',
      quoteSymbol: 'DAI'
    }
  ],
  venues: {
    binance: {
      name: 'Binance',
      enabled: process.env.BINANCE_ENABLED === 'true' || true,
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET
    },
    uniswap: {
      name: 'Uniswap V3',
      enabled: process.env.UNISWAP_ENABLED === 'true' || true,
      rpcUrl: process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID'
    },
    coinbase: {
      name: 'Coinbase Pro',
      enabled: process.env.COINBASE_ENABLED === 'true' || false,
      apiKey: process.env.COINBASE_API_KEY,
      apiSecret: process.env.COINBASE_API_SECRET
    },
    kraken: {
      name: 'Kraken',
      enabled: process.env.KRAKEN_ENABLED === 'true' || false,
      apiKey: process.env.KRAKEN_API_KEY,
      apiSecret: process.env.KRAKEN_API_SECRET
    }
  },
  arbitrage: {
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.1'),
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '0.5'),
    tradingFeePercent: {
      binance: parseFloat(process.env.BINANCE_FEE_PERCENT || '0.1'),
      uniswap: parseFloat(process.env.UNISWAP_FEE_PERCENT || '0.3')
    }
  },
  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '5000')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};