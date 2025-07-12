# DeltaHound - Cross-Venue Crypto Arbitrage Detector

A minimal TypeScript/Node.js application that detects arbitrage opportunities between different cryptocurrency venues (Binance and Uniswap V3).

## Features

- **Multi-venue support**: Binance and Uniswap V3 connectors
- **Pair-agnostic design**: Configurable trading pairs (defaults to ETH/USDT)
- **Fee and slippage aware**: Calculates net profit after trading fees and estimated slippage
- **Real-time detection**: Continuous polling of orderbooks and price data
- **Configurable**: Environment-based configuration for all parameters
- **Comprehensive logging**: Structured logging with Winston
- **Detection only**: No trade execution, purely for opportunity identification

## Architecture

```
backend/
├── src/
│   ├── connectors/          # Venue-specific connectors
│   │   ├── binance.ts      # Binance API integration
│   │   └── uniswap.ts      # Uniswap V3 integration
│   ├── utils/              # Helper utilities
│   │   ├── logger.ts       # Winston logger setup
│   │   └── price-normalizer.ts # Price data normalization
│   ├── arbitrage-detector.ts # Core arbitrage detection logic
│   ├── config.ts           # Configuration management
│   ├── types.ts            # TypeScript type definitions
│   └── index.ts            # Main entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:
   - Set your Binance API credentials (optional, works without for public data)
   - Set your Ethereum RPC URL for Uniswap integration
   - Configure trading pairs and thresholds

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_SYMBOL` | Base currency symbol | `ETH` |
| `QUOTE_SYMBOL` | Quote currency symbol | `USDT` |
| `BINANCE_ENABLED` | Enable Binance connector | `true` |
| `BINANCE_API_KEY` | Binance API key | (optional) |
| `BINANCE_API_SECRET` | Binance API secret | (optional) |
| `UNISWAP_ENABLED` | Enable Uniswap connector | `true` |
| `ETH_RPC_URL` | Ethereum RPC endpoint | Required for Uniswap |
| `MIN_PROFIT_THRESHOLD` | Minimum profit % to report | `0.1` |
| `MAX_SLIPPAGE_PERCENT` | Maximum slippage % | `0.5` |
| `BINANCE_FEE_PERCENT` | Binance trading fee % | `0.1` |
| `UNISWAP_FEE_PERCENT` | Uniswap trading fee % | `0.3` |
| `POLLING_INTERVAL_MS` | Polling interval in ms | `5000` |
| `LOG_LEVEL` | Logging level | `info` |

### Example Configuration

```bash
# Trading pair
BASE_SYMBOL=ETH
QUOTE_SYMBOL=USDT

# Venues
BINANCE_ENABLED=true
UNISWAP_ENABLED=true
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Arbitrage settings
MIN_PROFIT_THRESHOLD=0.1
MAX_SLIPPAGE_PERCENT=0.5
BINANCE_FEE_PERCENT=0.1
UNISWAP_FEE_PERCENT=0.3

# Polling
POLLING_INTERVAL_MS=5000

# Logging
LOG_LEVEL=info
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Output

The application will continuously scan for arbitrage opportunities and log them when found:

```json
{
  "level": "info",
  "message": "Arbitrage Opportunity Detected",
  "buyVenue": "Binance",
  "sellVenue": "Uniswap V3",
  "pair": "ETH/USDT",
  "buyPrice": 2450.50,
  "sellPrice": 2461.20,
  "grossProfit": 10.70,
  "netProfit": 3.15,
  "profitPercent": "0.129",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Adding New Venues

To add a new venue connector:

1. Create a new file in `src/connectors/`
2. Implement the `VenueConnector` interface
3. Add the connector to the initialization logic in `src/index.ts`
4. Update the configuration in `src/config.ts`

## Adding New Trading Pairs

The system supports any trading pair. To add new pairs:

1. Update the `tradingPairs` array in `src/config.ts`
2. Ensure both venues support the trading pair
3. For Uniswap, add token addresses to the `tokenMap` in `src/connectors/uniswap.ts`

## Limitations

- **No trade execution**: This is a detection-only system
- **Simplified slippage calculation**: Uses estimated slippage rather than real-time depth analysis
- **Limited to supported tokens**: Uniswap connector has a limited token map
- **No WebSocket support**: Uses REST API polling only

## Security

- Never commit real API keys to version control
- Use environment variables for all sensitive configuration
- Consider using read-only API keys where possible
- Monitor API rate limits to avoid being blocked

## License

MIT
>>>>>>> 737b822 (chore: readme)
