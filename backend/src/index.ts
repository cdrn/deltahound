import { config } from './config';
import { BinanceConnector } from './connectors/binance';
import { UniswapConnector } from './connectors/uniswap';
import { CoinbaseConnector } from './connectors/coinbase';
import { KrakenConnector } from './connectors/kraken';
import { ArbitrageDetector } from './arbitrage-detector';
import { PriceNormalizer } from './utils/price-normalizer';
import { logger } from './utils/logger';
import { VenueConnector, PriceData } from './types';

class DeltaHound {
  private connectors: VenueConnector[] = [];
  private arbitrageDetector: ArbitrageDetector;
  private isRunning = false;

  constructor() {
    this.initializeConnectors();
    this.arbitrageDetector = new ArbitrageDetector(config.arbitrage);
  }

  private initializeConnectors(): void {
    if (config.venues.binance.enabled) {
      const binanceConnector = new BinanceConnector(
        config.venues.binance.apiKey,
        config.venues.binance.apiSecret
      );
      this.connectors.push(binanceConnector);
      logger.info('Binance connector initialized');
    }

    if (config.venues.uniswap.enabled) {
      try {
        const uniswapConnector = new UniswapConnector(config.venues.uniswap.rpcUrl!);
        this.connectors.push(uniswapConnector);
        logger.info('Uniswap connector initialized');
      } catch (error) {
        logger.error('Failed to initialize Uniswap connector', { error });
      }
    }

    if (config.venues.coinbase.enabled) {
      try {
        const coinbaseConnector = new CoinbaseConnector(
          config.venues.coinbase.apiKey,
          config.venues.coinbase.apiSecret
        );
        this.connectors.push(coinbaseConnector);
        logger.info('Coinbase connector initialized');
      } catch (error) {
        logger.error('Failed to initialize Coinbase connector', { error });
      }
    }

    if (config.venues.kraken.enabled) {
      try {
        const krakenConnector = new KrakenConnector(
          config.venues.kraken.apiKey,
          config.venues.kraken.apiSecret
        );
        this.connectors.push(krakenConnector);
        logger.info('Kraken connector initialized');
      } catch (error) {
        logger.error('Failed to initialize Kraken connector', { error });
      }
    }

    if (this.connectors.length === 0) {
      throw new Error('No venue connectors initialized');
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('DeltaHound is already running');
      return;
    }

    this.isRunning = true;
    logger.info('DeltaHound started', {
      connectors: this.connectors.map(c => c.name),
      tradingPairs: config.tradingPairs,
      pollingInterval: config.polling.intervalMs
    });

    this.startPolling();
  }

  stop(): void {
    this.isRunning = false;
    logger.info('DeltaHound stopped');
  }

  private startPolling(): void {
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.scanForArbitrageOpportunities();
      } catch (error) {
        logger.error('Error during arbitrage scan', { error });
      }

      setTimeout(poll, config.polling.intervalMs);
    };

    poll();
  }

  private async scanForArbitrageOpportunities(): Promise<void> {
    for (const pair of config.tradingPairs) {
      try {
        const priceDataPromises = this.connectors.map(async (connector) => {
          try {
            return await connector.getPriceData(pair.baseSymbol, pair.quoteSymbol);
          } catch (error) {
            logger.error(`Failed to get price data from ${connector.name}`, { 
              pair: `${pair.baseSymbol}/${pair.quoteSymbol}`, 
              error 
            });
            return null;
          }
        });

        const priceDataResults = await Promise.all(priceDataPromises);
        const validPriceData = priceDataResults.filter((data): data is PriceData => data !== null);

        if (validPriceData.length < 2) {
          logger.warn(`Insufficient price data for ${pair.baseSymbol}/${pair.quoteSymbol}`);
          continue;
        }

        const normalizedPriceData = PriceNormalizer.normalizePriceData(validPriceData);
        
        logger.info('Price data collected', {
          pair: `${pair.baseSymbol}/${pair.quoteSymbol}`,
          prices: normalizedPriceData.map(data => ({
            venue: data.venue,
            bid: data.bid,
            ask: data.ask,
            spread: data.spread
          }))
        });

        const opportunities = this.arbitrageDetector.detectOpportunities(normalizedPriceData);
        
        if (opportunities.length > 0) {
          logger.info(`Found ${opportunities.length} arbitrage opportunities for ${pair.baseSymbol}/${pair.quoteSymbol}`);
          
          opportunities.forEach(opportunity => {
            this.arbitrageDetector.logOpportunity(opportunity);
          });
        } else {
          logger.debug(`No arbitrage opportunities found for ${pair.baseSymbol}/${pair.quoteSymbol}`);
        }

      } catch (error) {
        logger.error(`Error scanning pair ${pair.baseSymbol}/${pair.quoteSymbol}`, { error });
      }
    }
  }
}

async function main(): Promise<void> {
  try {
    const deltaHound = new DeltaHound();
    
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      deltaHound.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      deltaHound.stop();
      process.exit(0);
    });

    await deltaHound.start();
    
  } catch (error) {
    logger.error('Failed to start DeltaHound', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DeltaHound };