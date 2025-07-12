import { PriceData, ArbitrageOpportunity } from './types';
import { ArbitrageConfig } from './config';
import { PriceNormalizer } from './utils/price-normalizer';
import { logger } from './utils/logger';

export class ArbitrageDetector {
  constructor(private config: ArbitrageConfig) {}

  detectOpportunities(priceDataArray: PriceData[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    const validPriceData = priceDataArray.filter(data => 
      PriceNormalizer.validatePriceData(data)
    );

    if (validPriceData.length < 2) {
      logger.warn('Not enough valid price data to detect arbitrage opportunities');
      return opportunities;
    }

    for (let i = 0; i < validPriceData.length; i++) {
      for (let j = i + 1; j < validPriceData.length; j++) {
        const buyVenueData = validPriceData[i];
        const sellVenueData = validPriceData[j];
        
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

    return opportunities.filter(opp => 
      opp.profitPercent >= this.config.minProfitThreshold
    );
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
    logger.info('Arbitrage Opportunity Detected', {
      buyVenue: opportunity.buyVenue,
      sellVenue: opportunity.sellVenue,
      pair: opportunity.pair,
      buyPrice: opportunity.buyPrice,
      sellPrice: opportunity.sellPrice,
      grossProfit: opportunity.grossProfit,
      netProfit: opportunity.netProfit,
      profitPercent: opportunity.profitPercent.toFixed(3),
      timestamp: new Date(opportunity.timestamp).toISOString()
    });
  }
}