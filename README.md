# 🤖 ZENT Agentic Launchpad

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║        ███████╗███████╗███╗   ██╗████████╗                                   ║
║        ╚══███╔╝██╔════╝████╗  ██║╚══██╔══╝                                   ║
║          ███╔╝ █████╗  ██╔██╗ ██║   ██║                                      ║
║         ███╔╝  ██╔══╝  ██║╚██╗██║   ██║                                      ║
║        ███████╗███████╗██║ ╚████║   ██║                                      ║
║        ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝                                      ║
║                                                                               ║
║                    ZENT AGENTIC LAUNCHPAD                                     ║
║                                                                               ║
║           AI-Powered Token Launch Platform on Solana                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-purple)](https://solana.com)
[![Claude AI](https://img.shields.io/badge/Claude-Opus%204.5-orange)](https://anthropic.com)

> **The first AI-powered autonomous token launchpad on Solana with real-time agentic terminals.**

## 🌟 Features

### 🚀 Token Launch
- **One-Click Deployment** - Launch tokens with automatic liquidity pool creation
- **Multi-Quote Support** - Launch with SOL, USDC, or custom quote tokens
- **Vanity Addresses** - Pre-generated vanity mint addresses for branding
- **Meteora DLMM Integration** - Professional-grade liquidity pools

### 🤖 AI Agentic Terminal
- **Claude Opus 4.5 Powered** - Most advanced AI model
- **18 Content Types** - Lore, news, predictions, analysis, and more
- **Real-Time WebSocket** - Global sync across all users
- **Auto-Archive** - All content saved and downloadable
- **Token-Specific AI** - Each token gets personalized AI content

### 📊 Advanced Analytics
- **Live Market Data** - Price, mcap, volume, holders
- **Jupiter Integration** - Real-time price feeds
- **Whale Tracking** - Monitor large transactions
- **Holder Analysis** - Distribution insights

### 💰 Fee System
- **Platform Fee** - Configurable launch fee
- **Creator Fee Claims** - Deployers earn from trading fees
- **Transparent Earnings** - Real-time fee tracking

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Bonding Curve & Economics](#-bonding-curve--economics)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Agentic Terminal](#-agentic-terminal)
- [Deployment](#-deployment)
- [Security](#-security)
- [License](#-license)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZENT LAUNCHPAD                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│  │   Frontend    │    │   Backend     │    │   Blockchain  │   │
│  │   (HTML/JS)   │◄──►│   (Node.js)   │◄──►│   (Solana)    │   │
│  └───────────────┘    └───────────────┘    └───────────────┘   │
│         │                    │                    │             │
│         │                    │                    │             │
│  ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐     │
│  │  WebSocket  │      │  Claude AI  │      │   Meteora   │     │
│  │  Real-time  │      │  Opus 4.5   │      │    DLMM     │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | LowDB (JSON file-based) |
| Blockchain | Solana Web3.js, Meteora SDK |
| AI | Claude Opus 4.5 (Anthropic API) |
| Storage | Pinata IPFS |
| Real-time | WebSocket (ws) |

---

## 💹 Bonding Curve & Economics

### Meteora DLMM Bonding Curve

ZENT uses Meteora's Dynamic Liquidity Market Maker (DLMM) for automated market making:

```
Price Discovery Formula:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   P = P₀ × (1 + Δ)^(bin_id - bin_id₀)                      │
│                                                             │
│   Where:                                                    │
│   • P₀ = Initial price                                      │
│   • Δ = Bin step (price increment %)                        │
│   • bin_id = Current active bin                             │
│   • bin_id₀ = Initial bin                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Price Impact

| Trade Size | Approximate Impact |
|------------|-------------------|
| 0.1 SOL | ~0.1% |
| 1 SOL | ~1% |
| 10 SOL | ~5-10% |
| 100 SOL | ~20-40% |

### Fee Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    FEE DISTRIBUTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Trading Fee (per swap): 1%                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   Creator Share ──────────► 50%  → Token Deployer   │   │
│  │                                                     │   │
│  │   Platform Share ─────────► 25%  → Platform         │   │
│  │                                                     │   │
│  │   LP Providers ───────────► 25%  → Liquidity Pool   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Launch Fee

| Fee Type | Amount | Recipient |
|----------|--------|-----------|
| Platform Launch Fee | 0.05 SOL | Platform Treasury |
| Rent (Token Account) | ~0.002 SOL | Solana Network |
| Transaction Fee | ~0.000005 SOL | Validators |

### Token Economics

```
Total Supply: 1,000,000,000 (1 Billion)
Decimals: 6

Initial Distribution:
┌────────────────────────────────────────┐
│ 100% to Liquidity Pool (Fair Launch)   │
└────────────────────────────────────────┘

No team allocation. No presale. Pure fair launch.
```

---

## 🛠 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Solana CLI (optional, for wallet management)
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/zent-launchpad.git
cd zent-launchpad

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your keys
nano .env

# Create required directories
mkdir -p uploads vanity data

# Start the server
npm start
```

### Development Mode

```bash
# Start with hot reload
npm run dev
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# ===========================================
# ZENT AGENTIC LAUNCHPAD CONFIGURATION
# ===========================================

# Server Configuration
PORT=3000
NODE_ENV=production

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_SECRET=your_base58_private_key_here

# Pinata IPFS (for metadata storage)
PINATA_JWT=your_pinata_jwt_token_here

# Claude AI (for Agentic Terminal)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-opus-4-5-20251101
CLAUDE_MAX_TOKENS=2048

# Platform Configuration
PLATFORM_FEE_LAMPORTS=50000000
ADMIN_WALLET=your_admin_wallet_address

# Feature Flags
ENABLE_AGENTIC_TERMINAL=true
ENABLE_FEE_CLAIMS=true

# Render.com (if deploying to Render)
RENDER=false
```

### Quote Token Configuration

Edit `configs.json` to configure supported quote tokens:

```json
{
  "SOL": "So11111111111111111111111111111111111111112",
  "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
}
```

### Vanity Addresses

Pre-generate vanity mint keypairs for branding:

```bash
# Generate vanity addresses starting with "ZENT"
solana-keygen grind --starts-with ZENT:1

# Move generated keypairs to vanity folder
mv ZENT*.json vanity/
```

---

## 📡 API Reference

### Token Endpoints

#### Create Token
```http
POST /create
Content-Type: multipart/form-data

Parameters:
- name: string (required)
- symbol: string (required)
- description: string
- website: string
- twitter: string
- quote: string (SOL|USDC|USDT)
- deployer: string (wallet address)
- initialBuyAmount: number
- image: file
```

#### Get All Tokens
```http
GET /all-tokens

Response:
[
  {
    "baseMint": "...",
    "name": "Token Name",
    "symbol": "TKN",
    "mcap": 50000,
    "usdPrice": 0.0001,
    "holderCount": 150,
    ...
  }
]
```

#### Get Token by Deployer
```http
GET /tokens?deployer={walletAddress}
```

### Agentic Terminal Endpoints

#### Get Terminal Data
```http
GET /api/agentic/{tokenMint}

Response:
{
  "token": { ... },
  "history": [ ... ],
  "isRunning": true
}
```

#### Get Archive
```http
GET /api/agentic/{tokenMint}/archive
```

#### Download Archive (JSON)
```http
GET /api/agentic/{tokenMint}/archive/download
```

#### Download Archive (TXT)
```http
GET /api/agentic/{tokenMint}/archive/download/txt
```

### Fee Endpoints

#### Get Claimable Fees
```http
POST /quote-fees
Content-Type: application/json

Body:
{
  "poolAddresses": ["pool1", "pool2"]
}
```

#### Claim Fees
```http
POST /claim-fees
Content-Type: application/json

Body:
{
  "poolAddress": "...",
  "ownerWallet": "..."
}
```

### WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('wss://your-domain.com');

// Subscribe to agentic terminal
ws.send(JSON.stringify({
  type: 'subscribe_agentic',
  tokenMint: 'token_mint_address'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'agentic_update') {
    console.log('New content:', data.data);
  }
};
```

---

## 🤖 Agentic Terminal

### Content Types

The AI terminal generates 18 different content types:

| Type | Description | Color |
|------|-------------|-------|
| `lore` | Mystical token lore | Purple |
| `ascii_art` | Terminal ASCII art | Green |
| `breaking_news` | Fake news headlines | Yellow |
| `holder_analysis` | Chain analysis | Orange |
| `market_prediction` | Price predictions | Pink |
| `prophecy` | Dark prophecies | Purple glow |
| `technical_analysis` | RSI/MACD analysis | Cyan |
| `whale_alert` | Large tx alerts | Red |
| `solana_ecosystem` | SOL network news | Solana green |
| `crypto_research` | Research alpha | Blue |
| `world_news` | Global events | Yellow |
| `tech_innovation` | Tech breakthroughs | Purple |
| `defi_alpha` | DeFi opportunities | Teal |
| `sentiment_scan` | Market sentiment | Pink |
| `onchain_intel` | On-chain metrics | Cyan |
| `meme_culture` | Meme trends | Yellow |
| `ai_thoughts` | AI consciousness | Light purple |
| `market_psychology` | Trader psychology | Orange |

### Update Frequency

- Content generates every **30 seconds**
- Cycles through all 18 content types
- Archives keep last **1000 entries** (~8+ hours)

### Customization

Modify prompts in `server.js`:

```javascript
const systemPrompts = {
  lore: `Your custom lore prompt...`,
  // ... other prompts
};
```

---

## 🚀 Deployment

### Render.com

1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables
4. Add persistent disk at `/data`
5. Deploy

```yaml
# render.yaml
services:
  - type: web
    name: zent-launchpad
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: RENDER
        value: true
    disk:
      name: data
      mountPath: /data
      sizeGB: 1
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t zent-launchpad .
docker run -p 3000:3000 --env-file .env zent-launchpad
```

### VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/yourusername/zent-launchpad.git
cd zent-launchpad
npm install

# Setup PM2 for process management
npm install -g pm2
pm2 start server.js --name zent-launchpad
pm2 save
pm2 startup
```

---

## 🔒 Security

### Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Rotate API keys regularly** - Especially after suspected exposure
3. **Use environment variables** - Never hardcode secrets
4. **Enable rate limiting** - Prevent API abuse
5. **Validate all inputs** - Server-side validation is mandatory

### Wallet Security

```bash
# Generate a dedicated deployer wallet
solana-keygen new --outfile deployer.json

# Fund with minimum SOL for operations
solana transfer <DEPLOYER_ADDRESS> 1 --from <FUNDING_WALLET>

# Export as base58 for .env
cat deployer.json | node -e "
  const fs = require('fs');
  const bs58 = require('bs58');
  const key = JSON.parse(fs.readFileSync('/dev/stdin'));
  console.log(bs58.encode(Buffer.from(key)));
"
```

### Forbidden Content

The platform filters certain content:

```javascript
const FORBIDDEN_WORDS = ['word1', 'word2', ...];
```

Admin wallets can bypass these restrictions.

---

## 📁 Project Structure

```
zent-launchpad/
├── public/
│   └── index.html          # Frontend application
├── vanity/                  # Pre-generated mint keypairs
├── uploads/                 # Temporary file uploads
├── data/                    # Persistent data (Render)
├── server.js                # Main server application
├── configs.json             # Quote token configurations
├── db.json                  # LowDB database
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .gitignore              # Git ignore rules
├── LICENSE                  # MIT License
└── README.md               # This file
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Website**: [0xzerebro.io](https://0xzerebro.io)
- **Twitter**: [@ZENTSPY](https://x.com/ZENTSPY)


---

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Trading cryptocurrencies involves substantial risk of loss. The AI-generated content is for entertainment purposes only and should not be considered financial advice.

---

<p align="center">
  <b>Built with 💜 by the ZENT Team</b><br>
  <sub>Powered by Solana, Meteora, and Claude AI</sub>
</p>
