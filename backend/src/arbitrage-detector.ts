import { PriceData, ArbitrageOpportunity } from './types';
import { ArbitrageConfig } from './config';
import { PriceNormalizer } from './utils/price-normalizer';
import { logger } from './utils/logger';

export class ArbitrageDetector {
  constructor(private config: ArbitrageConfig) {}

  private isStablecoinPair(pair: string): boolean {
    const stablecoins = ['USDT', 'USDC', 'PYUSD', 'DAI', 'FRAX', 'TUSD'];
    const [base, quote] = pair.split('/');
    return stablecoins.includes(base) && stablecoins.includes(quote);
  }

  private groupByBaseAsset(priceDataArray: PriceData[]): Map<string, PriceData[]> {
    const grouped = new Map<string, PriceData[]>();
    
    for (const priceData of priceDataArray) {
      const [base] = priceData.pair.split('/');
      if (!grouped.has(base)) {
        grouped.set(base, []);
      }
      grouped.get(base)!.push(priceData);
    }
    
    return grouped;
  }

  private findStablecoinArbitrage(baseAsset: string, priceDataForBase: PriceData[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Group by stablecoin quote asset
    const byStablecoin = new Map<string, PriceData[]>();
    for (const data of priceDataForBase) {
      const [, quote] = data.pair.split('/');
      if (!byStablecoin.has(quote)) {
        byStablecoin.set(quote, []);
      }
      byStablecoin.get(quote)!.push(data);
    }
    
    // Compare prices across different stablecoins
    const stablecoins = Array.from(byStablecoin.keys());
    for (let i = 0; i < stablecoins.length; i++) {
      for (let j = i + 1; j < stablecoins.length; j++) {
        const stablecoin1Data = byStablecoin.get(stablecoins[i]) || [];
        const stablecoin2Data = byStablecoin.get(stablecoins[j]) || [];
        
        for (const data1 of stablecoin1Data) {
          for (const data2 of stablecoin2Data) {
            // Create synthetic arbitrage opportunity
            const opportunity = this.createStablecoinArbitrage(data1, data2);
            if (opportunity) {
              opportunities.push(opportunity);
            }
          }
        }
      }
    }
    
    return opportunities;
  }

  private createStablecoinArbitrage(data1: PriceData, data2: PriceData): ArbitrageOpportunity | null {
    // If ETH/USDT is cheaper than ETH/USDC, buy ETH with USDT, sell for USDC
    if (data1.ask < data2.bid) {
      return {
        buyVenue: data1.venue,
        sellVenue: data2.venue,
        pair: `${data1.pair} -> ${data2.pair}`,
        buyPrice: data1.ask,
        sellPrice: data2.bid,
        grossProfit: data2.bid - data1.ask,
        netProfit: (data2.bid - data1.ask) - (data1.ask * 0.001 + data2.bid * 0.001), // Simple fee estimate
        profitPercent: ((data2.bid - data1.ask) / data1.ask) * 100,
        timestamp: Date.now()
      };
    }
    
    // Reverse direction
    if (data2.ask < data1.bid) {
      return {
        buyVenue: data2.venue,
        sellVenue: data1.venue,
        pair: `${data2.pair} -> ${data1.pair}`,
        buyPrice: data2.ask,
        sellPrice: data1.bid,
        grossProfit: data1.bid - data2.ask,
        netProfit: (data1.bid - data2.ask) - (data2.ask * 0.001 + data1.bid * 0.001), // Simple fee estimate
        profitPercent: ((data1.bid - data2.ask) / data2.ask) * 100,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  detectOpportunities(priceDataArray: PriceData[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    const validPriceData = priceDataArray.filter(data => 
      PriceNormalizer.validatePriceData(data)
    );

    if (validPriceData.length < 2) {
      logger.warn('Not enough valid price data to detect arbitrage opportunities');
      return opportunities;
    }

    // Group by base asset to find stablecoin arbitrage opportunities
    const groupedByBase = this.groupByBaseAsset(validPriceData);
    
    // Find cross-stablecoin arbitrage opportunities
    for (const [baseAsset, priceDataForBase] of groupedByBase.entries()) {
      const stablecoinOpportunities = this.findStablecoinArbitrage(baseAsset, priceDataForBase);
      opportunities.push(...stablecoinOpportunities);
    }

    // Regular venue-to-venue arbitrage for same pairs
    for (let i = 0; i < validPriceData.length; i++) {
      for (let j = i + 1; j < validPriceData.length; j++) {
        const buyVenueData = validPriceData[i];
        const sellVenueData = validPriceData[j];
        
        // Only compare same trading pairs
        if (buyVenueData.pair === sellVenueData.pair) {
          const opportunity1 = this.calculateArbitrage(buyVenueData, sellVenueData);
          if (opportunity1) {
            opportunities.push(opportunity1);
          }
          
          const opportunity2 = this.calculateArbitrage(sellVenueData, buyVenueData);
          if (opportunity2) {
            opportunities.push(opportunity2);
          }
        }
      }
    }

    return opportunities.filter(opp => {
      const isStablecoin = this.isStablecoinPair(opp.pair);
      const threshold = isStablecoin ? 0.05 : this.config.minProfitThreshold; // Lower threshold for stablecoins
      return opp.profitPercent >= threshold;
    });
  }

  private calculateArbitrage(
    buyVenueData: PriceData, 
    sellVenueData: PriceData
  ): ArbitrageOpportunity | null {
    if (buyVenueData.pair !== sellVenueData.pair) {
      return null;
    }

    const buyPrice = buyVenueData.ask;
    const sellPrice = sellVenueData.bid;
    
    if (sellPrice <= buyPrice) {
      return null;
    }

    const grossProfit = sellPrice - buyPrice;
    
    const buyFee = this.getTradingFee(buyVenueData.venue) * buyPrice / 100;
    const sellFee = this.getTradingFee(sellVenueData.venue) * sellPrice / 100;
    
    const slippageCost = this.calculateSlippageCost(buyPrice, sellPrice);
    
    const totalCosts = buyFee + sellFee + slippageCost;
    const netProfit = grossProfit - totalCosts;
    
    if (netProfit <= 0) {
      return null;
    }

    const profitPercent = (netProfit / buyPrice) * 100;
    
    if (profitPercent < this.config.minProfitThreshold) {
      return null;
    }

    return {
      buyVenue: buyVenueData.venue,
      sellVenue: sellVenueData.venue,
      pair: buyVenueData.pair,
      buyPrice,
      sellPrice,
      grossProfit,
      netProfit,
      profitPercent,
      timestamp: Date.now()
    };
  }

  private getTradingFee(venue: string): number {
    switch (venue.toLowerCase()) {
      case 'binance':
        return this.config.tradingFeePercent.binance;
      case 'uniswap v3':
        return this.config.tradingFeePercent.uniswap;
      case 'coinbase pro':
        return 0.5; // Coinbase Pro fee
      case 'kraken':
        return 0.26; // Kraken fee
      default:
        return 0.1;
    }
  }

  private calculateSlippageCost(buyPrice: number, sellPrice: number): number {
    const averagePrice = (buyPrice + sellPrice) / 2;
    const estimatedSlippage = this.config.maxSlippagePercent / 100;
    
    return averagePrice * estimatedSlippage;
  }

  logOpportunity(opportunity: ArbitrageOpportunity): void {
    const isStablecoin = this.isStablecoinPair(opportunity.pair);
    const logLevel = isStablecoin ? 'warn' : 'info'; // Highlight stablecoin opportunities
    
    logger[logLevel]('Arbitrage Opportunity Detected', {
      type: isStablecoin ? 'STABLECOIN-PAIR' : 'CRYPTO',
      buyVenue: opportunity.buyVenue,
      sellVenue: opportunity.sellVenue,
      pair: opportunity.pair,
      buyPrice: opportunity.buyPrice.toFixed(isStablecoin ? 6 : 2),
      sellPrice: opportunity.sellPrice.toFixed(isStablecoin ? 6 : 2),
      grossProfit: opportunity.grossProfit.toFixed(isStablecoin ? 6 : 2),
      netProfit: opportunity.netProfit.toFixed(isStablecoin ? 6 : 2),
      profitPercent: opportunity.profitPercent.toFixed(3),
      pegDeviation: isStablecoin ? Math.abs(opportunity.buyPrice - 1.0).toFixed(6) : 'N/A',
      timestamp: new Date(opportunity.timestamp).toISOString()
    });
  }
}