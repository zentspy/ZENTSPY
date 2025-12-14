# 📡 API Reference

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. Wallet signatures are used for on-chain operations.

---

## Token Endpoints

### Create Token

Creates a new token with liquidity pool.

```http
POST /create
Content-Type: multipart/form-data
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Token name (max 32 chars) |
| symbol | string | Yes | Token symbol (max 10 chars) |
| description | string | No | Token description |
| website | string | No | Project website URL |
| twitter | string | No | Twitter handle |
| quote | string | Yes | Quote token (SOL, USDC, USDT) |
| deployer | string | Yes | Deployer wallet address |
| initialBuyAmount | number | No | Initial buy amount |
| image | file | No | Token logo (PNG, JPG, max 5MB) |

**Response:**

```json
{
  "transaction": "base64_encoded_transaction",
  "baseMint": "token_mint_address",
  "keypairFile": "vanity_keypair_filename",
  "uri": "ipfs_metadata_uri",
  "imageUrl": "ipfs_image_url"
}
```

**Error Responses:**

| Code | Error | Description |
|------|-------|-------------|
| 400 | Missing required fields | Name, symbol, quote, or deployer missing |
| 403 | UNAUTHORIZED_WALLET | Wallet not authorized to create |
| 403 | Forbidden keywords | Name/symbol contains banned words |
| 403 | Duplicate token | Name or symbol already exists |
| 500 | Server error | Internal error |

---

### Sign and Send Transaction

Signs transaction with mint keypair and broadcasts to network.

```http
POST /sign-and-send
Content-Type: application/json
```

**Body:**

```json
{
  "userSignedTransaction": "base64_encoded_signed_tx",
  "keypairFile": "vanity_keypair_filename"
}
```

**Response:**

```json
{
  "signature": "transaction_signature"
}
```

---

### Get All Tokens

Returns all launched tokens with market data.

```http
GET /all-tokens
```

**Response:**

```json
[
  {
    "baseMint": "mint_address",
    "name": "Token Name",
    "symbol": "TKN",
    "description": "Description",
    "imageUrl": "https://...",
    "quote": "SOL",
    "deployer": "deployer_address",
    "pool": "pool_address",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "mcap": 50000,
    "usdPrice": 0.00005,
    "holderCount": 150,
    "liquidity": 10000,
    "stats24h": {
      "volume": 5000,
      "priceChange24h": 15.5
    }
  }
]
```

---

### Get Tokens by Deployer

Returns tokens created by a specific wallet.

```http
GET /tokens?deployer={walletAddress}
```

**Response:** Same as `/all-tokens`

---

## Fee Endpoints

### Get Claimable Fees

Returns claimable fees for pool addresses.

```http
POST /quote-fees
Content-Type: application/json
```

**Body:**

```json
{
  "poolAddresses": ["pool1", "pool2", "pool3"]
}
```

**Response:**

```json
{
  "pool1": 50000000,
  "pool2": 25000000,
  "pool3": 0
}
```

Values are in smallest unit (lamports for SOL).

---

### Claim Fees

Generates transaction to claim accumulated fees.

```http
POST /claim-fees
Content-Type: application/json
```

**Body:**

```json
{
  "poolAddress": "pool_address",
  "ownerWallet": "owner_wallet_address"
}
```

**Response:**

```json
{
  "transaction": "base64_encoded_transaction"
}
```

---

## Agentic Terminal Endpoints

### Get Terminal Data

Initializes or retrieves terminal for a token.

```http
GET /api/agentic/{tokenMint}
```

**Response:**

```json
{
  "token": {
    "name": "Token Name",
    "symbol": "TKN",
    "baseMint": "mint_address",
    "mcap": 50000,
    "usdPrice": 0.00005,
    "holderCount": 150
  },
  "history": [
    {
      "type": "lore",
      "content": "In the depths of the blockchain...",
      "timestamp": 1704067200000,
      "token": "TKN"
    }
  ],
  "isRunning": true
}
```

---

### Generate Content

Force generates new agentic content.

```http
POST /api/agentic/{tokenMint}/generate
Content-Type: application/json
```

**Body (optional):**

```json
{
  "contentType": "lore"
}
```

**Content Types:**

- `lore` - Mystical token lore
- `ascii_art` - Terminal ASCII art
- `breaking_news` - News headlines
- `holder_analysis` - Chain analysis
- `market_prediction` - Price predictions
- `prophecy` - Dark prophecies
- `technical_analysis` - TA
- `whale_alert` - Whale alerts
- `solana_ecosystem` - SOL news
- `crypto_research` - Research
- `world_news` - Global events
- `tech_innovation` - Tech news
- `defi_alpha` - DeFi alpha
- `sentiment_scan` - Sentiment
- `onchain_intel` - On-chain data
- `meme_culture` - Meme trends
- `ai_thoughts` - AI reflection
- `market_psychology` - Psychology

---

### Get Archive

Returns all archived content for a token.

```http
GET /api/agentic/{tokenMint}/archive
```

**Response:**

```json
{
  "tokenMint": "mint_address",
  "count": 150,
  "archive": [
    {
      "type": "lore",
      "content": "...",
      "timestamp": 1704067200000,
      "token": "TKN",
      "archivedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Download Archive (JSON)

Downloads archive as JSON file.

```http
GET /api/agentic/{tokenMint}/archive/download
```

**Response:** JSON file download

---

### Download Archive (TXT)

Downloads archive as readable text file.

```http
GET /api/agentic/{tokenMint}/archive/download/txt
```

**Response:** Text file download

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://your-domain.com');
```

### Subscribe to Agentic Terminal

```javascript
ws.send(JSON.stringify({
  type: 'subscribe_agentic',
  tokenMint: 'token_mint_address'
}));
```

### Receive Updates

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'agentic_history':
      // Initial history load
      console.log(data.history);
      break;
      
    case 'agentic_update':
      // New content generated
      console.log(data.data);
      break;
  }
};
```

### Unsubscribe

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe_agentic',
  tokenMint: 'token_mint_address'
}));
```

---

## Utility Endpoints

### Get Countdown Status

```http
GET /countdown-status
```

**Response:**

```json
{
  "endTime": 1734256800000,
  "remaining": 86400000,
  "active": true,
  "ended": false
}
```

---

### Get Launcher Config

```http
GET /config/launcher
```

**Response:**

```json
{
  "allowedLauncher": "wallet_address_or_empty",
  "restricted": true
}
```

---

### Token Image Proxy

Proxies and caches token images.

```http
GET /token-image?url={imageUrl}
```

**Response:** Image file (cached)

---

## Platform Stats

```http
GET /platform-stats
```

**Response:**

```json
{
  "totalVolume24h": 150000,
  "totalTokens": 50,
  "platformEarnings": 2500,
  "newTokens24h": 5
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Token creation | 10/hour per wallet |
| Fee claims | 30/hour per wallet |
| General API | 100/minute per IP |
| WebSocket | 10 connections per IP |

---

## Error Handling

All errors return JSON:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED_WALLET | Wallet not authorized |
| MISSING_FIELDS | Required fields missing |
| FORBIDDEN_CONTENT | Banned content detected |
| DUPLICATE_TOKEN | Token already exists |
| RATE_LIMITED | Too many requests |
| INTERNAL_ERROR | Server error |
