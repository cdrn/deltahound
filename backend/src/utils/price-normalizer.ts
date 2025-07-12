import { PriceData } from '../types';

export class PriceNormalizer {
  static normalizePriceData(priceData: PriceData[]): PriceData[] {
    return priceData.map(data => ({
      ...data,
      bid: this.roundToSignificantDigits(data.bid, 6),
      ask: this.roundToSignificantDigits(data.ask, 6),
      spread: this.roundToSignificantDigits(data.spread, 4)
    }));
  }

  static calculateSpread(bid: number, ask: number): number {
    return ((ask - bid) / bid) * 100;
  }

  static getMidPrice(bid: number, ask: number): number {
    return (bid + ask) / 2;
  }

  static getPriceImpact(price: number, referencePrice: number): number {
    return ((price - referencePrice) / referencePrice) * 100;
  }

  private static roundToSignificantDigits(num: number, digits: number): number {
    if (num === 0) return 0;
    
    const magnitude = Math.floor(Math.log10(Math.abs(num)));
    const factor = Math.pow(10, digits - magnitude - 1);
    
    return Math.round(num * factor) / factor;
  }

  static validatePriceData(priceData: PriceData): boolean {
    if (!priceData) return false;
    
    const { bid, ask, spread } = priceData;
    
    if (bid <= 0 || ask <= 0) return false;
    
    if (ask <= bid) return false;
    
    if (spread < 0 || spread > 10) return false;
    
    const calculatedSpread = this.calculateSpread(bid, ask);
    if (Math.abs(calculatedSpread - spread) > 0.01) return false;
    
    return true;
  }
}