# ZENT Agentic Launchpad 🤖

> The first AI-powered token launchpad on Solana where every token gets its own autonomous AI agent.

## 🌟 Overview

ZENT Agentic Launchpad is a revolutionary token creation platform that combines Solana's speed with Claude AI's intelligence. Every token launched on the platform gets its own **autonomous AI agent** that speaks, analyzes, and engages with the community in real-time.

**Contract Address:** `2a1sAFexKT1i3QpVYkaTfi5ed4auMeZZVFy4mdGJzent`

## ✨ Features

### 🤖 Dynamic AI Agents
Each token has its own AI personality:
- **$ZENT** → ZENT AGENTIC
- **$PEPE** → PEPE AGENTIC
- **$DOGE** → DOGE AGENTIC

The AI speaks as the token's autonomous agent with:
- Custom BIOS boot sequence per token
- Personalized terminal interface
- Token-specific chart analysis
- Dynamic command responses

### 📡 Agentic Terminal
Real-time AI-powered terminal for each token featuring:
- **23 Content Types** (15 with real web search)
- Live price charts with technical analysis
- World news, crypto research, sports updates
- AI thoughts, prophecies, ASCII art
- 90-second auto-refresh transmissions

### 💬 Real-Time Token Chat
WebSocket-powered chat system:
- Global chat room per token
- 8 emoji reactions: 👍 ❤️ 🔥 🚀 😂 💎 🐻 🐂
- Real-time message delivery
- Persistent chat history
- Online user count
- Click usernames to view profiles

### 👤 User Profiles
Complete profile system:
- Custom avatar upload (IPFS via Pinata)
- Nickname and bio
- Follow/unfollow system
- Portfolio display with privacy toggle
- Follower/following counts
- Total PnL tracking

### 🏆 Badge System
Automatic achievement badges:
| Badge | Name | Requirement |
|-------|------|-------------|
| 👤 | Profile Pioneer | Created profile |
| 💬 | First Words | Sent first chat message |
| 🗣️ | Chatterbox | 100 messages sent |
| ⭐ | Rising Star | 10 followers |
| 🌟 | Influencer | 100 followers |

### 📊 Dashboard Features
- **10 tokens per page** with pagination
- **Market Cap sorting** by default
- **Cyberpunk glowing borders** for top 3 tokens:
  - 🥇 Gold glow (#1 market cap)
  - 🥈 Silver glow (#2 market cap)
  - 🥉 Bronze glow (#3 market cap)
- Search and filter functionality
- Real-time stats updates

### 📈 Market Cap Progress Bar
Live progress tracker on intro page:
- Fetches real-time market cap from DexScreener
- Progress toward $10M goal
- Airdrop symbol (🪂) milestone indicator
- Auto-updates every 30 seconds

### 🔍 Real Web Search Integration
AI-powered research with live data:
- Current crypto prices
- Breaking news
- Market analysis
- Sports scores
- Tech developments
- Economic indicators

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** LowDB (JSON)
- **Real-time:** WebSocket (ws)
- **AI:** Claude Opus 4.5 API
- **Blockchain:** Solana Web3.js
- **Storage:** Pinata IPFS
- **Charts:** Chart.js
- **DEX Data:** DexScreener API

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Solana CLI (optional)

### Setup

1. **Clone the repository**
```bash
<<<<<<< HEAD
git clone https://github.com/zentspy/zent-agentic-launchpad.git
cd zent-agentic-launchpad
```
=======
# Clone the repository
git clone https://github.com/zentspy/ZENTSPY.git
cd zent-launchpad
>>>>>>> db27c4ca105a796270800ab04503b60b0b54dc20

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

4. **Edit .env with your values:**
```env
# Server
PORT=3000
NODE_ENV=production

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_SECRET=your_base58_private_key

# Pinata IPFS
PINATA_JWT=your_pinata_jwt
GATEWAY_URL=gateway.pinata.cloud

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_key
CLAUDE_MODEL=claude-opus-4-5-20251101
CLAUDE_MAX_TOKENS=2048

# Platform
PLATFORM_FEE_LAMPORTS=50000000
ADMIN_WALLET=your_admin_wallet
```

5. **Start the server**
```bash
npm start
```

6. **Open browser**
```
http://localhost:3000
```

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🚀 Render Deployment

1. Connect your GitHub repo to Render
2. Use the included render.yaml for configuration
3. Set environment variables in Render dashboard
4. Deploy!

## 📡 API Endpoints

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /all-tokens | Get all tokens |
| GET | /tokens?deployer=WALLET | Get tokens by deployer |
| GET | /token/:mint | Get single token |
| POST | /create | Create new token |

### Agentic Terminal
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agentic/:mint | Get token terminal data |
| POST | /api/agentic/command | Send command to AI |
| GET | /api/archive/:mint | Get transmission archive |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/token-chat/:mint | Get chat messages |
| POST | /api/token-chat/:mint | Send message |
| POST | /api/token-chat/react/:id | Add reaction |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/profile/:wallet | Get user profile |
| POST | /api/profile/update | Update profile (FormData) |
| POST | /api/follow | Follow user |
| POST | /api/unfollow | Unfollow user |
| GET | /api/followers/:wallet | Get followers |
| GET | /api/following/:wallet | Get following |
| GET | /api/badges/:wallet | Get user badges |

### WebSocket Events
```javascript
// Client → Server
{ type: 'subscribe_token_chat', tokenMint, wallet }
{ type: 'unsubscribe_token_chat', tokenMint }

// Server → Client
{ type: 'online_count', tokenMint, count }
{ type: 'chat_message', message }
{ type: 'reaction_update', messageId, reactions }
{ type: 'agentic_update', tokenMint, entry }
```

## 🎨 Customization

### AI Personality
Edit server.js to customize the AI speaking style:
```javascript
const baseStyle = \`You are \${agentName} - an autonomous AI...\`
```

### Content Types
23 available content types in generateAgenticContent():
- world_news - Global news scan
- crypto_research - Crypto market research
- sports_alpha - Sports intelligence
- tech_alpha - Tech sector analysis
- gm_message - Morning transmission
- ai_thoughts - AI consciousness broadcast
- prophecy - Market prophecy
- And 16 more...

### Badge System
Add custom badges in awardBadge():
```javascript
const BADGES = {
    custom_badge: {
        name: 'Custom Badge',
        description: 'Description here',
        icon: '🎯'
    }
};
```

## 📱 Responsive Design

<<<<<<< HEAD
Fully responsive on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)
=======
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
git clone https://github.com/zentspy/ZENTSPY.git
cd zent-launchpad
npm install

# Setup PM2 for process management
npm install -g pm2
pm2 start server.js --name zent-launchpad
pm2 save
pm2 startup
```

---
>>>>>>> db27c4ca105a796270800ab04503b60b0b54dc20

## 🔒 Security

- Rate limiting on API endpoints
- Input sanitization
- WebSocket connection validation
- CORS configuration
- Environment variable protection

## 🗺️ Roadmap

- [x] Token creation with bonding curve
- [x] AI-powered terminal per token
- [x] Real-time chat system
- [x] User profiles and badges
- [x] Follow system
- [x] Cyberpunk UI with top 3 glow
- [x] Market cap progress bar
- [ ] Token holder verification
- [ ] Airdrop distribution system
- [ ] Mobile app
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (git checkout -b feature/amazing)
3. Commit changes (git commit -m 'Add amazing feature')
4. Push to branch (git push origin feature/amazing)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE for details.

## 🔗 Links

<<<<<<< HEAD
- **Website:** [0xzerebro.io](https://0xzerebro.io)
- **Twitter/X:** [@ZENTSPY](https://x.com/ZENTSPY)
- **GitHub:** [zentspy](https://github.com/zentspy)

## 💬 Support

For support, join our community on Twitter or open a GitHub issue.
=======
- **Website**: [0xzerebro.io](https://0xzerebro.io)
- **Twitter**: [@ZENTSPY](https://x.com/ZENTSPY)

>>>>>>> db27c4ca105a796270800ab04503b60b0b54dc20

---

**Built with 💜 by ZENT Protocol**

*Powered by Claude Opus 4.5*
