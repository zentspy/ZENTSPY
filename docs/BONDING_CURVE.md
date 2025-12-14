# 💹 Bonding Curve & Token Economics

## Overview

ZENT Launchpad uses **Meteora DLMM (Dynamic Liquidity Market Maker)** for automated market making. This provides professional-grade liquidity pools with concentrated liquidity and dynamic fees.

## How It Works

### Meteora DLMM

Unlike traditional AMMs (like Uniswap's constant product formula), Meteora DLMM uses a **bin-based system** where liquidity is distributed across discrete price ranges (bins).

```
Traditional AMM:
x * y = k (constant product)

Meteora DLMM:
Liquidity distributed in bins along price curve
Each bin has a specific price range
Active bin = current trading price
```

### Price Discovery

When a token is launched:

1. **Initial Liquidity** is deposited into the pool
2. **Price starts at bin 0** (initial price)
3. **As buys occur**, price moves up through bins
4. **As sells occur**, price moves down through bins

### Bin Step

The `bin_step` parameter determines price granularity:

| Bin Step | Price Increment | Use Case |
|----------|-----------------|----------|
| 1 | 0.01% | Stable pairs |
| 10 | 0.1% | Low volatility |
| 25 | 0.25% | Standard tokens |
| 100 | 1% | High volatility |
| 250 | 2.5% | Meme coins |

ZENT uses a bin step appropriate for volatile token launches.

## Token Launch Process

### 1. Token Creation

```
Total Supply: 1,000,000,000 (1 Billion)
Decimals: 6
Distribution: 100% to Liquidity Pool
```

### 2. Pool Initialization

When you launch a token:

1. Token mint is created with vanity address
2. Metadata is uploaded to IPFS (Pinata)
3. Meteora DLMM pool is created
4. Initial liquidity is deposited
5. Trading begins immediately

### 3. Initial Buy (Optional)

Creators can make an initial buy during launch:
- Ensures creator has tokens
- Sets initial price discovery
- Creates immediate trading activity

## Fee Structure

### Trading Fees

Every swap incurs a trading fee:

```
┌─────────────────────────────────────────┐
│           TRADING FEE: 1%               │
├─────────────────────────────────────────┤
│                                         │
│  50% → Token Creator (claimable)        │
│  25% → Platform Treasury                │
│  25% → LP Rewards (auto-compounded)     │
│                                         │
└─────────────────────────────────────────┘
```

### Platform Launch Fee

One-time fee paid when launching:

```
Platform Fee: 0.05 SOL
├── Covers: Server costs, IPFS storage
└── Recipient: Platform treasury
```

### Network Fees

```
Token Account Rent: ~0.002 SOL
Transaction Fee: ~0.000005 SOL
```

## Fee Claims

Token creators can claim accumulated trading fees:

### How to Claim

1. Go to "My Agents" tab
2. See your deployed tokens
3. Click "Claim Fees" button
4. Approve transaction in wallet
5. Fees sent to your wallet

### Fee Accumulation

Fees accumulate in real-time as trades occur:

```javascript
// Example fee accumulation
Trade: 10 SOL buy
Trading Fee: 0.1 SOL (1%)
Creator Share: 0.05 SOL (50% of fee)
```

## Price Impact

Price impact depends on:
- Trade size
- Liquidity depth
- Bin configuration

### Approximate Impact

| Trade Size | Low Liquidity | Medium | High |
|------------|--------------|--------|------|
| 0.1 SOL | 5% | 1% | 0.1% |
| 1 SOL | 20% | 5% | 1% |
| 10 SOL | 50%+ | 20% | 5% |

## Bonding Curve Visualization

```
Price
  ^
  │                              ╱
  │                           ╱
  │                        ╱
  │                     ╱
  │                  ╱
  │               ╱
  │            ╱
  │         ╱
  │      ╱
  │   ╱
  │╱
  └────────────────────────────────► Supply Sold

  As more tokens are bought:
  - Price increases
  - Curve becomes steeper
  - Early buyers benefit most
```

## Market Cap Calculation

```javascript
Market Cap = Current Price × Total Supply

Example:
Price: $0.0001
Supply: 1,000,000,000
Market Cap: $100,000
```

## Liquidity Depth

Liquidity is concentrated around the active price:

```
      Active Bin
         ↓
    ┌────┬────┐
    │    │████│ ← Most liquidity here
    │    │████│
    │    │███ │
    │    │██  │
    │    │█   │
    └────┴────┘
   Lower  Higher
   Price  Price
```

## Slippage Protection

ZENT includes built-in slippage protection:

```javascript
// Default slippage: 1%
// Max slippage: 50%

// Transaction fails if price moves more than slippage
```

## Advanced: Pool Configuration

For developers, pool parameters can be customized:

```javascript
const poolConfig = {
  binStep: 25,           // Price granularity
  baseFactor: 10000,     // Base fee (basis points)
  filterPeriod: 30,      // Volatility filter (seconds)
  decayPeriod: 600,      // Fee decay period
  reductionFactor: 5000, // Fee reduction
  variableFeeControl: 40000,
  maxVolatilityAccumulator: 350000,
  minBinId: -443636,     // Min price bin
  maxBinId: 443636,      // Max price bin
};
```

## Security Considerations

### For Traders
- Always check liquidity before trading
- Use appropriate slippage settings
- Be aware of price impact on large trades

### For Creators
- Initial liquidity determines price stability
- Monitor your pools for unusual activity
- Claim fees regularly

## Resources

- [Meteora Documentation](https://docs.meteora.ag)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [DLMM Whitepaper](https://docs.meteora.ag/dlmm/overview)
