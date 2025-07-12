import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { CurrencyAmount, Token, Percent } from '@uniswap/sdk-core';
import { VenueConnector, Orderbook, PriceData, OrderbookEntry } from '../types';

const UNISWAP_V3_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86a33E6412E4ca7c2F6e8b7d0A3d6E9c7A1A2b';
const PYUSD_ADDRESS = '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8';

const QUOTER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'quoteExactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

export class UniswapConnector implements VenueConnector {
  public readonly name = 'Uniswap V3';
  private provider: JsonRpcProvider;
  private quoterContract: Contract;
  
  private readonly tokenMap: { [key: string]: { address: string; decimals: number } } = {
    'ETH': { address: WETH_ADDRESS, decimals: 18 },
    'WETH': { address: WETH_ADDRESS, decimals: 18 },
    'USDT': { address: USDT_ADDRESS, decimals: 6 },
    'USDC': { address: USDC_ADDRESS, decimals: 6 },
    'PYUSD': { address: PYUSD_ADDRESS, decimals: 6 }
  };

  constructor(rpcUrl: string) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.quoterContract = new Contract(UNISWAP_V3_QUOTER_ADDRESS, QUOTER_ABI, this.provider);
  }

  isConnected(): boolean {
    return this.provider !== null;
  }

  private getTokenInfo(symbol: string): { address: string; decimals: number } {
    const tokenInfo = this.tokenMap[symbol.toUpperCase()];
    if (!tokenInfo) {
      throw new Error(`Token ${symbol} not supported`);
    }
    return tokenInfo;
  }

  async getOrderbook(baseSymbol: string, quoteSymbol: string): Promise<Orderbook> {
    const priceData = await this.getPriceData(baseSymbol, quoteSymbol);
    
    const midPrice = (priceData.bid + priceData.ask) / 2;
    const spread = priceData.ask - priceData.bid;
    
    const bids: OrderbookEntry[] = [
      { price: priceData.bid, quantity: 1000 },
      { price: priceData.bid - spread * 0.1, quantity: 2000 },
      { price: priceData.bid - spread * 0.2, quantity: 3000 }
    ];

    const asks: OrderbookEntry[] = [
      { price: priceData.ask, quantity: 1000 },
      { price: priceData.ask + spread * 0.1, quantity: 2000 },
      { price: priceData.ask + spread * 0.2, quantity: 3000 }
    ];

    return {
      bids,
      asks,
      timestamp: priceData.timestamp
    };
  }

  async getPriceData(baseSymbol: string, quoteSymbol: string): Promise<PriceData> {
    try {
      const tokenInInfo = this.getTokenInfo(baseSymbol);
      const tokenOutInfo = this.getTokenInfo(quoteSymbol);
      
      const amountIn = Math.pow(10, tokenInInfo.decimals).toString();
      const fee = 3000;
      
      const amountOut = await this.quoterContract.callStatic.quoteExactInputSingle(
        tokenInInfo.address,
        tokenOutInfo.address,
        fee,
        amountIn,
        0
      );

      const price = parseFloat(amountOut.toString()) / Math.pow(10, tokenOutInfo.decimals);
      
      const bidPrice = price * 0.999;
      const askPrice = price * 1.001;
      const spread = ((askPrice - bidPrice) / bidPrice) * 100;

      return {
        venue: this.name,
        pair: `${baseSymbol}/${quoteSymbol}`,
        bid: bidPrice,
        ask: askPrice,
        spread,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to fetch Uniswap price data for ${baseSymbol}/${quoteSymbol}: ${error}`);
    }
  }
}