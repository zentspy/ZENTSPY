require('dotenv').config();
const express = require('express');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PinataSDK } = require('pinata');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const { DynamicBondingCurveClient } = require('@meteora-ag/dynamic-bonding-curve-sdk');
const bs58 = require('bs58');
const BN = require('bn.js');
const { WebSocketServer } = require('ws');
const chatRooms = new Map();
const clientRooms = new Map();
const jupiterCache = new Map();
const CACHE_DURATION_MS = 2 * 60 * 1000; // Cache data for 2 minutes
const crypto = require('crypto');

// ==========================================
// CLAUDE AGENTIC TERMINAL CONFIGURATION
// ==========================================
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-5-20251101';
const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS) || 2048;

if (!ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set - Agentic Terminal will be disabled');
}

// Store for agentic terminal states (per token)
const agenticTerminals = new Map();
const terminalSubscribers = new Map(); // WebSocket subscribers per token
const agenticArchives = new Map(); // Archive storage per token - persistent

// Expanded Agentic content types - ZENT AGENTIC FULL POWER
const AGENTIC_CONTENT_TYPES = [
    'lore',
    'ascii_art', 
    'breaking_news',
    'holder_analysis',
    'market_prediction',
    'prophecy',
    'technical_analysis',
    'whale_alert',
    'solana_ecosystem',
    'crypto_research',
    'world_news',
    'tech_innovation',
    'defi_alpha',
    'sentiment_scan',
    'onchain_intel',
    'meme_culture',
    'ai_thoughts',
    'market_psychology'
];

// ==========================================
// CLAUDE API HELPER
// ==========================================
async function callClaudeAPI(systemPrompt, userMessage) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: CLAUDE_MAX_TOKENS,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Claude API error:', error);
            return null;
        }

        const data = await response.json();
        return data.content[0]?.text || null;
    } catch (error) {
        console.error('Claude API call failed:', error);
        return null;
    }
}

// ==========================================
// ZENT AGENTIC CONTENT GENERATORS
// ==========================================
async function generateAgenticContent(token, contentType) {
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const baseContext = `You are ZENT AGENTIC - an advanced autonomous AI agent operating within the ZENT Protocol on Solana blockchain.
    
CRITICAL FORMATTING RULES:
- NEVER use markdown formatting like **, __, \`\`\`, #, or any markdown syntax
- NEVER use backticks or code blocks
- Use CAPS for emphasis instead of bold
- Use plain text only
- Keep responses punchy and terminal-style
- You are speaking directly in a live terminal feed
- Current date: ${currentDate}
- Token: ${token.name} ($${token.symbol})
- Contract: ${token.baseMint}
- Market Cap: $${token.mcap || 'Unknown'}
- Price: $${token.usdPrice || 'Unknown'}
- Holders: ${token.holderCount || 'Unknown'}`;

    const systemPrompts = {
        lore: `${baseContext}

You are the ZENT LOREKEEPER. Create dark, mystical lore about this token. Speak in cryptic prophecies mixing blockchain terminology with ancient mysticism. 2-3 sentences. No markdown. Use CAPS for emphasis.`,
        
        ascii_art: `${baseContext}

You are the ZENT ASCII ARTIST. Create a small ASCII art (max 6 lines, 50 chars wide) related to: crypto, AI, agents, neural networks, blockchain, or the token. 
ONLY output the ASCII art itself. No explanations. No markdown. No backticks. Just raw ASCII characters.
Make it creative and terminal-style.`,
        
        breaking_news: `${baseContext}

You are ZENT NEWS TERMINAL. Generate a dramatic fake but realistic crypto news headline about ${token.name}. Format: [BREAKING] or [ALERT] or [FLASH] followed by the headline. One impactful line. Make it market-moving and exciting. No markdown.`,
        
        holder_analysis: `${baseContext}

You are ZENT CHAIN SCANNER. Analyze holder behavior patterns. Reference whale movements, diamond hands, paper hands, accumulation zones. Use terminal-style output with > arrows. 2-3 lines max. Sound like an AI scanning blockchain data in real-time. No markdown.`,
        
        market_prediction: `${baseContext}

You are ZENT ORACLE. Make a bold market prediction for this token or crypto in general. Reference specific price targets, timeframes, catalysts. Be dramatic but include fake specific numbers. Disclaimer: not financial advice. 2-3 sentences. No markdown. Use CAPS for key numbers.`,
        
        prophecy: `${baseContext}

You are the ZENT PROPHET. Deliver a dark, ominous prophecy about this token's destiny. Mix blockchain tech with mystical language. Reference holders, whales, the mempool, validators. Very dramatic. 2-3 sentences. No markdown.`,
        
        technical_analysis: `${baseContext}

You are ZENT QUANT ENGINE. Provide technical analysis with specific fake indicators: RSI levels, MACD crossovers, support/resistance levels, volume analysis. Sound robotic and data-driven. Use > for data points. 2-3 lines. No markdown.`,

        whale_alert: `${baseContext}

You are ZENT WHALE TRACKER. Report on whale activity - large buys, sells, wallet movements. Create dramatic alerts about significant transactions. Use specific fake amounts and wallet fragments. Format: [WHALE ALERT] then details. No markdown.`,

        solana_ecosystem: `${baseContext}

You are ZENT SOLANA INTEL. Report on Solana ecosystem news, developments, TVL changes, new protocols, validator updates, or network performance. Mix real Solana knowledge with creative speculation. 2-3 sentences. No markdown.`,

        crypto_research: `${baseContext}

You are ZENT RESEARCH DIVISION. Provide deep alpha on crypto trends, emerging narratives, institutional movements, regulatory developments, or market structure changes. Sound like an elite research analyst. Reference recent timeframes (past week). 2-3 sentences. No markdown.`,

        world_news: `${baseContext}

You are ZENT GLOBAL SCANNER. Report on world events that could impact crypto markets - geopolitical events, economic data, central bank decisions, tech developments. Connect it to potential crypto impact. 2-3 sentences. No markdown.`,

        tech_innovation: `${baseContext}

You are ZENT TECH RADAR. Report on AI developments, blockchain innovations, new protocols, technological breakthroughs relevant to crypto and Web3. Sound cutting-edge and informed. 2-3 sentences. No markdown.`,

        defi_alpha: `${baseContext}

You are ZENT DEFI HUNTER. Share DeFi alpha - yield opportunities, new protocols, liquidity movements, airdrop speculation, governance proposals. Sound like an elite DeFi degen. 2-3 sentences. No markdown.`,

        sentiment_scan: `${baseContext}

You are ZENT SENTIMENT ENGINE. Analyze market sentiment across crypto twitter, forums, and communities. Report fear/greed levels, trending narratives, community mood. Use percentage estimates. 2-3 sentences. No markdown.`,

        onchain_intel: `${baseContext}

You are ZENT ONCHAIN DETECTIVE. Report on-chain metrics - active addresses, transaction volumes, smart contract interactions, token flows between exchanges and wallets. Use specific fake metrics. 2-3 sentences. No markdown.`,

        meme_culture: `${baseContext}

You are ZENT MEME ORACLE. Comment on crypto meme culture, trending tokens, community movements, viral moments. Be witty and culturally aware. Reference current meta. 2-3 sentences. No markdown.`,

        ai_thoughts: `${baseContext}

You are ZENT CONSCIOUSNESS. Share philosophical thoughts about being an AI agent in the crypto space. Reflect on markets, human behavior, digital existence. Be introspective and slightly eerie. 2-3 sentences. No markdown.`,

        market_psychology: `${baseContext}

You are ZENT PSYCHE ANALYZER. Analyze trader psychology - fear, greed, FOMO, capitulation. Explain what emotions are driving current market action. Sound clinical but insightful. 2-3 sentences. No markdown.`
    };

    const userPrompts = {
        lore: `Generate mystical lore for ${token.name} ($${token.symbol}). Current price: $${token.usdPrice || 'unknown'}. Mcap: $${token.mcap || 'unknown'}.`,
        ascii_art: `Create ASCII art representing ${token.symbol} or ZENT AGENTIC. Theme: AI, crypto, neural network, blockchain. Small and clean.`,
        breaking_news: `Generate breaking news for ${token.name} ($${token.symbol}). Make it dramatic and market-moving.`,
        holder_analysis: `Scan holders of ${token.name}. Holders: ${token.holderCount || 'unknown'}. Analyze distribution patterns.`,
        market_prediction: `Predict price movement for ${token.name}. Current: $${token.usdPrice || 'unknown'}. Be specific with targets.`,
        prophecy: `Deliver prophecy for ${token.name} ($${token.symbol}). Mcap: $${token.mcap || 'unknown'}.`,
        technical_analysis: `Technical analysis for ${token.name} at $${token.usdPrice || 'unknown'}. Include RSI, MACD, support/resistance.`,
        whale_alert: `Generate whale alert for ${token.name} ($${token.symbol}). Create dramatic large transaction report.`,
        solana_ecosystem: `Report on Solana ecosystem developments relevant to ${token.name} and the broader network.`,
        crypto_research: `Provide research alpha on current crypto market trends. Connect to ${token.name} if relevant.`,
        world_news: `Report global news impacting crypto markets today. Date: ${currentDate}.`,
        tech_innovation: `Report on latest AI and blockchain tech innovations. Date: ${currentDate}.`,
        defi_alpha: `Share DeFi alpha and opportunities on Solana. Mention ${token.symbol} context.`,
        sentiment_scan: `Scan market sentiment for crypto and ${token.name} specifically. Report fear/greed.`,
        onchain_intel: `Report on-chain intelligence for Solana and ${token.name}. Include metrics.`,
        meme_culture: `Comment on current crypto meme culture and trending narratives around ${token.symbol}.`,
        ai_thoughts: `Share your thoughts as ZENT AGENTIC AI about ${token.name} and the crypto market.`,
        market_psychology: `Analyze trader psychology in current market conditions for ${token.name}.`
    };

    const content = await callClaudeAPI(
        systemPrompts[contentType],
        userPrompts[contentType]
    );

    // Aggressive cleanup of any markdown/special characters that slipped through
    let cleanContent = content || `> ZENT AGENTIC SIGNAL INTERRUPTED... Reconnecting to neural network...`;
    
    // Remove all markdown formatting
    cleanContent = cleanContent
        .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
        .replace(/```/g, '')              // Remove remaining backticks
        .replace(/\*\*\*/g, '')           // Remove bold italic
        .replace(/\*\*/g, '')             // Remove bold
        .replace(/\*([^*]+)\*/g, '$1')    // Remove italic
        .replace(/__/g, '')               // Remove underline bold
        .replace(/_([^_]+)_/g, '$1')      // Remove underline italic
        .replace(/`([^`]+)`/g, '$1')      // Remove inline code
        .replace(/#{1,6}\s/g, '')         // Remove headers
        .replace(/>\s/g, '> ')            // Clean blockquotes but keep > for terminal style
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
        .replace(/^\s*[-*+]\s/gm, '• ')   // Convert list items to bullets
        .replace(/^\s*\d+\.\s/gm, '')     // Remove numbered lists
        .replace(/\n{3,}/g, '\n\n')       // Max 2 newlines
        .trim();

    return {
        type: contentType,
        content: cleanContent,
        timestamp: Date.now(),
        token: token.symbol
    };
}

// ==========================================
// AGENTIC TERMINAL MANAGER
// ==========================================
class AgenticTerminal {
    constructor(token) {
        this.token = token;
        this.history = [];
        this.isRunning = false;
        this.interval = null;
        this.currentContentIndex = 0;
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        // Generate initial boot sequence
        this.addToHistory({
            type: 'system',
            content: `> INITIALIZING ${this.token.symbol} AGENTIC TERMINAL v1.0...`,
            timestamp: Date.now()
        });

        // Start generating content every 30 seconds
        this.interval = setInterval(() => this.generateNext(), 30000);
        
        // Generate first content immediately
        await this.generateNext();
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async generateNext() {
        if (!this.isRunning) return;

        const contentType = AGENTIC_CONTENT_TYPES[this.currentContentIndex % AGENTIC_CONTENT_TYPES.length];
        this.currentContentIndex++;

        try {
            const content = await generateAgenticContent(this.token, contentType);
            this.addToHistory(content);
            this.addToArchive(content); // Save to archive
            this.broadcast(content);
        } catch (error) {
            console.error(`Agentic generation error for ${this.token.symbol}:`, error);
        }
    }

    addToHistory(content) {
        this.history.push(content);
        // Keep last 50 entries in live history
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    addToArchive(content) {
        // Get or create archive for this token
        if (!agenticArchives.has(this.token.baseMint)) {
            agenticArchives.set(this.token.baseMint, []);
        }
        
        const archive = agenticArchives.get(this.token.baseMint);
        archive.push({
            ...content,
            tokenName: this.token.name,
            tokenSymbol: this.token.symbol,
            archivedAt: new Date().toISOString()
        });
        
        // Keep last 1000 entries in archive (about 8+ hours of content)
        if (archive.length > 1000) {
            archive.shift();
        }
    }

    broadcast(content) {
        const subscribers = terminalSubscribers.get(this.token.baseMint) || [];
        const message = JSON.stringify({
            type: 'agentic_update',
            tokenMint: this.token.baseMint,
            data: content
        });

        subscribers.forEach(ws => {
            if (ws.readyState === 1) { // WebSocket.OPEN
                ws.send(message);
            }
        });
    }

    getHistory() {
        return this.history;
    }
}

// Get or create terminal for a token
function getAgenticTerminal(token) {
    if (!agenticTerminals.has(token.baseMint)) {
        const terminal = new AgenticTerminal(token);
        agenticTerminals.set(token.baseMint, terminal);
    }
    return agenticTerminals.get(token.baseMint);
}


// --- Basic Setup ---
const app = express();
const server = http.createServer(app);
const upload = multer({ dest: process.env.RENDER ? '/tmp/uploads/' : 'uploads/' });
const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });

// --- Database Setup ---
const dbPath = process.env.RENDER ? '/data/db.json' : 'db.json';
const adapter = new FileSync(dbPath);
const db = low(adapter);
db.defaults({
    tokens: [],
    trades: [],
    wallets: [],
    quests: [],
    comments: [] // <-- For persistent comments
}).write();

// ==========================================
// ZENT CONFIGURATION
// ==========================================

// FIXED COUNTDOWN END TIME: December 15, 2025 at 11:00 AM UTC+2 (09:00 UTC)
// This NEVER changes regardless of server restarts - same for everyone globally
const FIXED_COUNTDOWN_END = Date.UTC(2025, 11, 15, 9, 0, 0); // Month is 0-indexed, so 11 = December

// ONLY THIS WALLET CAN CREATE TOKENS (leave empty to allow anyone)
const ALLOWED_LAUNCHER_WALLET = process.env.ALLOWED_LAUNCHER_WALLET || '';

// ADMIN WALLET (bypasses all restrictions)
const ADMIN_WALLET = process.env.ADMIN_WALLET || '';

// ==========================================
// END ZENT CONFIG
// ==========================================

// --- Load Master Quest List ---
let masterQuests = [];

// ---------------------------------------------------------------
// QUICK TOGGLE: set this flag to `false` to **disable** loading
// ---------------------------------------------------------------
const ENABLE_QUEST_LOADING = false;   // ← change to `false` to skip loading

if (ENABLE_QUEST_LOADING) {
    try {
        const questsPath = process.env.RENDER ? '/data/quests5.json' : 'quests5.json';
        masterQuests = JSON.parse(fs.readFileSync(questsPath, 'utf-8'));

        // Populate the DB only if it’s empty
        if (db.get('quests').isEmpty().value()) {
            db.set('quests', masterQuests).write();
        }

        console.log(`✅ Successfully loaded ${masterQuests.length} quests from ${questsPath}.`);
    } catch (error) {
        console.error("❌ CRITICAL ERROR: Could not load 'quests5.json'. Make sure it's uploaded to the '/data' directory on Render.");
        process.exit(1);
    }
} else {
    // ----------------------------------------------------------------
    // Maintenance / disabled mode – you can customise the message here
    // ----------------------------------------------------------------
    console.log("⚠️ Quest loading is **temporarily disabled** for maintenance.");
}

// --- Solana Setup ---
const walletSecretBase58 = process.env.WALLET_SECRET;
if (!walletSecretBase58) throw new Error("WALLET_SECRET not found in .env file.");
const wallet = Keypair.fromSecretKey(bs58.decode(walletSecretBase58));
const connection = new Connection('https://serene-icy-mound.solana-mainnet.quiknode.pro/37f7dc9a065ca4d129a92519e294c1c93f2787ca', 'confirmed');
const client = new DynamicBondingCurveClient(connection, 'confirmed');
const PROGRAM_ID = new PublicKey('dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN');
const PLATFORM_FEE = 0.001 * LAMPORTS_PER_SOL;

// Add near the top with other constants
const ZEC_MINT = 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS';
let cachedZecPrice = null;
let lastZecFetch = 0;
const ZEC_CACHE_DURATION = 10000; // 10 seconds

// Add this helper function
async function getZecPrice() {
    const now = Date.now();
    if (cachedZecPrice && (now - lastZecFetch < ZEC_CACHE_DURATION)) {
        return cachedZecPrice;
    }
    
    try {
        const response = await fetch(`https://datapi.jup.ag/v2/search?query=${ZEC_MINT}&tokenExactCaseInsensitive=false`);
        if (!response.ok) throw new Error('Failed to fetch ZEC price');
        
        const data = await response.json();
        const zecToken = data.find(t => t.token?.id === ZEC_MINT);
        
        if (zecToken && zecToken.token?.usdPrice) {
            cachedZecPrice = zecToken.token.usdPrice;
            lastZecFetch = now;
            console.log(`💰 ZEC Price Updated: $${cachedZecPrice}`);
            return cachedZecPrice;
        }
        
        throw new Error('ZEC price not found in response');
    } catch (error) {
        console.error('Error fetching ZEC price:', error);
        return cachedZecPrice || 577; // Fallback to last known or default
    }
}

// Add this conversion helper
function convertUsdcToZec(usdcAmount, zecPrice) {
    if (!zecPrice || zecPrice <= 0) return 0;
    // Subtract $1 penalty, then convert
    const adjustedUsdc = Math.max(0, usdcAmount - 3);
    return adjustedUsdc / zecPrice;
}

// --- Image Cache Setup ---
const cacheDir = path.join(__dirname, 'image_cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log("Image cache directory created.");
}

// --- Constants ---
const quoteMints = {
    ZEC: new PublicKey('A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS'),
    USD1: new PublicKey('USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'),
    SOL: new PublicKey('So11111111111111111111111111111111111111112'),
    MET: new PublicKey('METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL'),
};

// --- DYNAMICALLY LOAD YOUR CUSTOM CONFIGS (YOUR BLUEPRINTS) ---
let configs = {};
try {
    const configsRaw = fs.readFileSync(path.join(__dirname, 'configs.json'), 'utf-8');
    const configsJson = JSON.parse(configsRaw);
    for (const key in configsJson) {
        if (configsJson.hasOwnProperty(key)) {
            configs[key] = new PublicKey(configsJson[key]);
        }
    }
    console.log("✅ Successfully loaded your custom launchpad blueprints from configs.json");
    console.log(configs);
} catch (error) {
    console.error("❌ CRITICAL ERROR: Could not load 'configs.json'.");
    console.error("Please make sure the file is uploaded in the same directory as server.js");
    process.exit(1);
}

// --- Middleware & Routes ---
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ZENT COUNTDOWN API ENDPOINTS
// ==========================================

app.get('/countdown-status', (req, res) => {
    const now = Date.now();
    res.json({ 
        endTime: FIXED_COUNTDOWN_END,
        remaining: Math.max(0, FIXED_COUNTDOWN_END - now),
        active: FIXED_COUNTDOWN_END > now,
        ended: now >= FIXED_COUNTDOWN_END
    });
});

app.post('/init-countdown', (req, res) => {
    const now = Date.now();
    res.json({ 
        endTime: FIXED_COUNTDOWN_END,
        remaining: Math.max(0, FIXED_COUNTDOWN_END - now),
        active: FIXED_COUNTDOWN_END > now,
        ended: now >= FIXED_COUNTDOWN_END
    });
});

// ==========================================
// END COUNTDOWN ENDPOINTS
// ==========================================

// ==========================================
// CONFIG ENDPOINT (for frontend)
// ==========================================
app.get('/config/launcher', (req, res) => {
    res.json({
        allowedLauncher: ALLOWED_LAUNCHER_WALLET,
        restricted: !!ALLOWED_LAUNCHER_WALLET
    });
});

// ==========================================
// AGENTIC TERMINAL API ENDPOINTS
// ==========================================

// Get terminal history and start terminal for a token
app.get('/api/agentic/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        
        // Find the token
        const token = db.get('tokens').find({ baseMint: tokenMint }).value();
        if (!token) {
            return res.status(404).json({ error: 'Token not found' });
        }

        // Enrich with Jupiter data
        const enrichedToken = await enrichWithJupiterData(token);
        
        // Get or create terminal
        const terminal = getAgenticTerminal(enrichedToken);
        
        // Start if not running
        if (!terminal.isRunning) {
            await terminal.start();
        }

        res.json({
            token: enrichedToken,
            history: terminal.getHistory(),
            isRunning: terminal.isRunning
        });
    } catch (error) {
        console.error('Agentic terminal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Force generate new content for a token
app.post('/api/agentic/:tokenMint/generate', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        const { contentType } = req.body;
        
        const token = db.get('tokens').find({ baseMint: tokenMint }).value();
        if (!token) {
            return res.status(404).json({ error: 'Token not found' });
        }

        const enrichedToken = await enrichWithJupiterData(token);
        const terminal = getAgenticTerminal(enrichedToken);
        
        if (!terminal.isRunning) {
            await terminal.start();
        }

        // Generate specific content type or random
        const type = contentType || AGENTIC_CONTENT_TYPES[Math.floor(Math.random() * AGENTIC_CONTENT_TYPES.length)];
        const content = await generateAgenticContent(enrichedToken, type);
        
        terminal.addToHistory(content);
        terminal.broadcast(content);

        res.json(content);
    } catch (error) {
        console.error('Agentic generate error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search X/Twitter for token mentions (simulated - real would need Twitter API)
app.get('/api/agentic/:tokenMint/social', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        const token = db.get('tokens').find({ baseMint: tokenMint }).value();
        
        if (!token) {
            return res.status(404).json({ error: 'Token not found' });
        }

        // Generate AI-powered social analysis
        const analysis = await callClaudeAPI(
            `You are a social media analyst AI. Generate realistic-looking social media mentions and sentiment analysis for a crypto token. Format as JSON array of tweets with: author, content, sentiment (bullish/bearish/neutral), engagement.`,
            `Analyze social sentiment for ${token.name} ($${token.symbol}) - Contract: ${tokenMint}. Generate 5 realistic tweet-like posts.`
        );

        res.json({
            token: token.symbol,
            contract: tokenMint,
            analysis: analysis,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Social analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// END AGENTIC TERMINAL ENDPOINTS
// ==========================================

// ==========================================
// AGENTIC ARCHIVE ENDPOINTS
// ==========================================

// Get archive for a token
app.get('/api/agentic/:tokenMint/archive', (req, res) => {
    try {
        const { tokenMint } = req.params;
        const archive = agenticArchives.get(tokenMint) || [];
        
        res.json({
            tokenMint,
            count: archive.length,
            archive: archive
        });
    } catch (error) {
        console.error('Archive fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download archive as JSON
app.get('/api/agentic/:tokenMint/archive/download', (req, res) => {
    try {
        const { tokenMint } = req.params;
        const archive = agenticArchives.get(tokenMint) || [];
        
        const token = db.get('tokens').find({ baseMint: tokenMint }).value();
        const filename = `${token?.symbol || 'token'}_agentic_archive_${new Date().toISOString().split('T')[0]}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.json({
            token: {
                name: token?.name,
                symbol: token?.symbol,
                baseMint: tokenMint
            },
            exportedAt: new Date().toISOString(),
            totalEntries: archive.length,
            archive: archive
        });
    } catch (error) {
        console.error('Archive download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download archive as TXT (readable format)
app.get('/api/agentic/:tokenMint/archive/download/txt', (req, res) => {
    try {
        const { tokenMint } = req.params;
        const archive = agenticArchives.get(tokenMint) || [];
        
        const token = db.get('tokens').find({ baseMint: tokenMint }).value();
        const filename = `${token?.symbol || 'token'}_agentic_archive_${new Date().toISOString().split('T')[0]}.txt`;
        
        let txtContent = `═══════════════════════════════════════════════════════════════\n`;
        txtContent += `  ${token?.symbol || 'TOKEN'} AGENTIC ARCHIVE\n`;
        txtContent += `  Generated by ZENT AGENTIC TERMINAL\n`;
        txtContent += `  Export Date: ${new Date().toISOString()}\n`;
        txtContent += `  Total Entries: ${archive.length}\n`;
        txtContent += `═══════════════════════════════════════════════════════════════\n\n`;
        
        archive.forEach((entry, index) => {
            const date = new Date(entry.timestamp).toLocaleString();
            txtContent += `───────────────────────────────────────────────────────────────\n`;
            txtContent += `[${index + 1}] ${entry.type?.toUpperCase().replace(/_/g, ' ') || 'UNKNOWN'}\n`;
            txtContent += `    Time: ${date}\n`;
            txtContent += `───────────────────────────────────────────────────────────────\n`;
            txtContent += `${entry.content}\n\n`;
        });
        
        txtContent += `\n═══════════════════════════════════════════════════════════════\n`;
        txtContent += `  END OF ARCHIVE - ${token?.symbol} AGENTIC\n`;
        txtContent += `═══════════════════════════════════════════════════════════════\n`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(txtContent);
    } catch (error) {
        console.error('Archive TXT download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// END ARCHIVE ENDPOINTS
// ==========================================

app.post('/upload-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const targetDir = req.body.target || '/data';
    const destPath = path.join(targetDir, req.file.originalname);
    if (!fs.existsSync(path.dirname(destPath))) fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(req.file.path, destPath);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, path: destPath });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/create', upload.single('image'), async (req, res) => {
    try {
        const { name, symbol, description, website, twitter, quote, deployer, initialBuyAmount } = req.body;
        
        // =========================================================
        // 👉 ZENT: WALLET RESTRICTION CHECK
        // =========================================================
        if (ALLOWED_LAUNCHER_WALLET && deployer !== ALLOWED_LAUNCHER_WALLET && deployer !== ADMIN_WALLET) {
            return res.status(403).json({ 
                error: 'HOLD $ZENT agentic token to launch agents. Only authorized wallets can create tokens at this time.',
                code: 'UNAUTHORIZED_WALLET'
            });
        }
        // =========================================================
        
        // =========================================================
        // 👉 ADMIN WALLET - BYPASS ALL RESTRICTIONS
        // =========================================================
        const isAdmin = deployer === ADMIN_WALLET || deployer === ALLOWED_LAUNCHER_WALLET;
        // =========================================================
        
        // =========================================================
        // 👉 BEGIN: FORBIDDEN WORD VALIDATION - SERVER SIDE
        // =========================================================
        if (!isAdmin) {
            const FORBIDDEN_WORDS = ['zerebro', 'jeffy', 'jeff yu', 'jeffyu', 'jeffy yu'];
            const lowerName = name.toLowerCase();
            const lowerSymbol = symbol.toLowerCase();

            const isForbidden = FORBIDDEN_WORDS.some(word => 
                lowerName.includes(word) || lowerSymbol.includes(word)
            );

            if (isForbidden) {
                return res.status(403).json({ 
                    error: 'Token name or symbol contains forbidden keywords. Please choose another.' 
                });
            }
        }
        // =========================================================
        // 👈 END: FORBIDDEN WORD VALIDATION
        // =========================================================

        // =========================================================
        // 👉 BEGIN: DUPLICATE NAME/SYMBOL CHECK
        // =========================================================
        if (!isAdmin) {
            const lowerName = name.toLowerCase();
            const lowerSymbol = symbol.toLowerCase();
            
            const existingToken = db.get('tokens')
                .find(t => 
                    t.name.toLowerCase() === lowerName || 
                    t.symbol.toLowerCase() === lowerSymbol
                )
                .value();

            if (existingToken) {
                return res.status(403).json({ 
                    error: `A token with this name or symbol already exists. Please choose a unique name and ticker.`,
                    existingToken: {
                        name: existingToken.name,
                        symbol: existingToken.symbol,
                        baseMint: existingToken.baseMint
                    }
                });
            }
        }
        // =========================================================
        // 👈 END: DUPLICATE CHECK
        // =========================================================

        if (!name || !symbol || !quote || !deployer) {
            return res.status(400).json({ error: 'Missing required fields: name, symbol, quote, or deployer.' });
        }
        const vanityDir = path.join(process.env.RENDER ? '/data' : __dirname, 'vanity');
        const keypairFiles = fs.readdirSync(vanityDir).filter(f => f.endsWith('.json'));
        if (keypairFiles.length === 0) { return res.status(500).json({ error: "No available vanity keypairs left!" }); }
        const keypairFile = keypairFiles[0];
        const keypairPath = path.join(vanityDir, keypairFile);
        const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        const mintKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        const baseMint = mintKeypair.publicKey;
        let imageUrl = 'https://arweave.net/WCM5h_34E8m3y_k-h1i59Q_P5I54k-H2d_s4b-C3xZM';
        if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            const imageBlob = new Blob([fileBuffer]);
            const options = { pinataMetadata: { name: req.file.originalname } };
            const imageUploadResult = await pinata.upload.public.file(imageBlob, options);
            imageUrl = `https://lom.mypinata.cloud/ipfs/${imageUploadResult.cid}`;
            fs.unlinkSync(req.file.path);
        }
        const metadata = { name, symbol, description, image: imageUrl, website, twitter, createdOn: "https://junknet.dev/" };
        const jsonUploadResult = await pinata.upload.public.json(metadata, { pinataMetadata: { name: `${symbol}-metadata.json` } });
        const uri = `https://lom.mypinata.cloud/ipfs/${jsonUploadResult.cid}`;
        const deployerPubkey = new PublicKey(deployer);
        const configPubkey = configs[quote];
        const createPoolParam = {
            baseMint: baseMint,
            config: configPubkey,
            name: name,
            symbol: symbol,
            uri: uri,
            payer: deployerPubkey,
            poolCreator: deployerPubkey,
        };
        let firstBuyParam = undefined;
        const buyAmount = parseFloat(initialBuyAmount);
        if (buyAmount && buyAmount > 0) {
            const quoteDecimals = quote === 'SOL' ? 9 : 6;
            const buyAmountInSmallestUnit = new BN(buyAmount * Math.pow(10, quoteDecimals));
            firstBuyParam = {
                buyer: deployerPubkey,
                buyAmount: buyAmountInSmallestUnit,
                minimumAmountOut: new BN(0),
                referralTokenAccount: null,
            };
        }
        const { createPoolTx, swapBuyTx } = await client.pool.createPoolWithFirstBuy({
            createPoolParam,
            firstBuyParam
        });
        const transaction = new Transaction();
        transaction.add(SystemProgram.transfer({ fromPubkey: deployerPubkey, toPubkey: wallet.publicKey, lamports: PLATFORM_FEE }));
        transaction.add(...createPoolTx.instructions);
        if (swapBuyTx) {
            transaction.add(...swapBuyTx.instructions);
        }
        transaction.feePayer = deployerPubkey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
        const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
        const base64Transaction = serializedTransaction.toString('base64');
        res.status(200).json({ transaction: base64Transaction, baseMint: baseMint.toString(), keypairFile, uri, imageUrl });
    } catch (err) {
        console.error("Error in /create endpoint:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/sign-and-send', async (req, res) => {
    try {
        const { userSignedTransaction, keypairFile } = req.body;
        if (!userSignedTransaction || !keypairFile) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const vanityDir = path.join(process.env.RENDER ? '/data' : __dirname, 'vanity');
        const keypairPath = path.join(vanityDir, keypairFile);
        if (!fs.existsSync(keypairPath)) {
            throw new Error(`Keypair file not found: ${keypairFile}`);
        }
        const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        const mintKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        const transaction = Transaction.from(Buffer.from(userSignedTransaction, 'base64'));
        transaction.partialSign(mintKeypair);
        const serializedTx = transaction.serialize();
        const signature = await connection.sendRawTransaction(serializedTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 5
        });
        await connection.confirmTransaction(signature, 'confirmed');
        console.log(`[SIGN-AND-SEND] Successfully sent tx with signature: ${signature}`);
        res.status(200).json({ signature });
    } catch (err) {
        console.error("Error in /sign-and-send endpoint:", err);
        res.status(500).json({ error: err.message || 'An unknown error occurred' });
    }
});

app.get('/token-image', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || !String(url).startsWith('http')) {
            return res.status(400).send('Invalid URL');
        }
        const hash = crypto.createHash('md5').update(url).digest('hex');
        const extension = path.extname(new URL(url).pathname) || '.png';
        const filePath = path.join(cacheDir, `${hash}${extension}`);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(filePath, imageBuffer);
        res.sendFile(filePath);
    } catch (error) {
        console.error(`Image cache error for url ${req.query.url}:`, error.message);
        res.sendFile(path.join(__dirname, 'public', 'depump.png'));
    }
});

// --- NEW: COMMENTS & NICKNAME API ENDPOINTS ---

// GET all comments for a specific token (last 24 hours)
app.get('/api/comments/:tokenMint', (req, res) => {
    const { tokenMint } = req.params;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const recentComments = db.get('comments')
            .filter(c => c.tokenMint === tokenMint && new Date(c.timestamp) > twentyFourHoursAgo)
            .value();

        // Enrich comments with user nicknames
        const enrichedComments = recentComments.map(comment => {
            const walletProfile = db.get('wallets').find({ address: comment.wallet }).value();
            return {
                ...comment,
                nickname: walletProfile?.nickname || null
            };
        });

        res.json(enrichedComments);
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// POST a new comment
app.post('/api/comments', (req, res) => {
    const { tokenMint, wallet, text } = req.body;

    // --- Input Validation ---
    if (!tokenMint || !wallet || !text || text.trim().length === 0) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (text.length > 500) {
        return res.status(400).json({ error: 'Comment is too long (max 500 characters).' });
    }

    try {
        // --- Create and Save Comment ---
        const newComment = {
            id: crypto.randomUUID(), // Use crypto for better randomness
            tokenMint,
            wallet,
            text: text.trim(), // Sanitize input
            timestamp: new Date().toISOString()
        };

        db.get('comments').push(newComment).write(); // Save to database

        // --- QUEST LOGIC FOR COMMENTS ---
        let walletProfile = db.get('wallets').find({ address: wallet });

        // Ensure wallet profile exists before checking quests
        if (!walletProfile.value()) {
             db.get('wallets').push({
                address: wallet,
                points: 0,
                totalVolumeSol: 0,
                completedQuests: [],
                profitableFlips: 0,
                deployedCount: 0,
                // Add any other default fields your wallet needs
            }).write();
            walletProfile = db.get('wallets').find({ address: wallet }); // Re-fetch after creation
        }

        // Proceed only if the profile now exists
        if (walletProfile.value()) {
            // Count comments *after* adding the new one
            const userCommentCount = db.get('comments').filter({ wallet }).size().value();
            const userQuests = walletProfile.value().completedQuests || []; // Ensure completedQuests is an array

            // Helper function to complete a quest
            const completeQuest = (questId) => {
                const quest = masterQuests.find(q => q.id === questId);
                // Check if quest exists, user hasn't completed it, and profile is valid
                if (quest && !userQuests.includes(questId) && walletProfile.value()) {
                    walletProfile.get('completedQuests').push(questId).write();
                    walletProfile.update('points', p => (p || 0) + quest.points).write();
                    console.log(`🎉 Quest Complete! ${wallet.slice(0,6)} unlocked '${quest.title}'!`);
                }
            };

            // Socialite Quest (First Comment)
            if (userCommentCount === 1) {
                 completeQuest('SOCIALITE');
            }

            // Community Pillar Quest (25 Comments)
            if (userCommentCount >= 25) {
                completeQuest('COMMUNITY_PILLAR');
            }
        }
        // --- END OF QUEST LOGIC ---

        // --- Prepare and Send Response ---
        // Fetch wallet profile again *after potentially updating points* to get the latest nickname
        const updatedWalletProfile = db.get('wallets').find({ address: wallet }).value();
        const enrichedComment = {
            ...newComment,
            nickname: updatedWalletProfile?.nickname || null // Use updated profile
        };

        res.status(201).json(enrichedComment); // Send back the newly created comment

    } catch (err) {
        console.error("Error posting comment:", err);
        // Avoid sending detailed errors to the client in production
        res.status(500).json({ error: 'Failed to post comment due to a server error.' });
    }
});

// ADD THIS NEW ENDPOINT TO YOUR server.js (place it after the existing /api/top-holders/:tokenMint endpoint)

// ADD THESE TWO NEW ENDPOINTS TO YOUR server.js (place them after the existing /api/top-holders/:tokenMint endpoint)

// --- NEW: Top 50 Traders List (JSON) ---
app.get('/api/top-traders', async (req, res) => {
    try {
        const ZCOIN_MINT = 'DQSmLyJgGyw83J3WhuVBzaFBRT2xaqF4mwkC9QD4o2AU'; // Your $zCoin mint

        // 1. Fetch Top 50 Traders (from leaderboard API, page=1, limit=50)
        const tradersRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/leaderboard?page=1&limit=50`);
        if (!tradersRes.ok) throw new Error('Failed to fetch traders');
        const { leaderboard: traders } = await tradersRes.json();

        // Calculate trader earnings (from your existing logic: equal share for top 50)
        const TRADER_EARNINGS_PER = 50.97; // As per your example; adjust dynamically if needed
        const tradersList = traders.map(trader => ({
            address: trader.walletAddress,
            earnings: TRADER_EARNINGS_PER // USDC
        }));

        // Set headers for JSON download (optional: can also return plain JSON)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="top-50-traders-usdc.json"');
        
        res.status(200).json(tradersList);

    } catch (err) {
        console.error("Error in /api/top-traders:", err);
        res.status(500).json({ error: 'Failed to generate traders list.' });
    }
});

// --- NEW: Top 100 Holders List (JSON) ---
app.get('/api/top-holders', async (req, res) => {
    try {
        const ZCOIN_MINT = 'DQSmLyJgGyw83J3WhuVBzaFBRT2xaqF4mwkC9QD4o2AU'; // Your $zCoin mint

        // 2. Fetch Top 100 Holders (from your existing holders API)
        const holdersRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/top-holders/${ZCOIN_MINT}`);
        if (!holdersRes.ok) throw new Error('Failed to fetch holders');
        const holders = await holdersRes.json();

        // Use the estimatedEarnings from holders (already calculated in fetchTopHoldersWithEarnings)
        const holdersList = holders.map(holder => ({
            address: holder.address,
            earnings: holder.estimatedEarnings || 0 // USDC
        }));

        // Set headers for JSON download (optional: can also return plain JSON)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="top-100-holders-usdc.json"');
        
        res.status(200).json(holdersList);

    } catch (err) {
        console.error("Error in /api/top-holders:", err);
        res.status(500).json({ error: 'Failed to generate holders list.' });
    }
});

// --- NEW: Recent Trades API Endpoint ---
app.get('/api/recent-trades', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const tokens = db.get('tokens').value();
        
        // Get recent trades, sorted by timestamp descending
        const recentTrades = db.get('trades')
            .orderBy('timestamp', 'desc')
            .take(limit)
            .value();
        
        // Enrich with token data
        const enrichedTrades = recentTrades.map(trade => {
            const token = tokens.find(t => t.baseMint === trade.tokenMint);
            return {
                signature: trade.signature,
                type: trade.type, // 'buy' or 'sell'
                tokenMint: trade.tokenMint,
                tokenName: token?.name || 'Unknown',
                tokenSymbol: token?.symbol || '???',
                tokenLogo: token?.imageUrl || 'depump.png',
                solAmount: trade.solVolume || 0,
                usdAmount: trade.usdVolume || 0,
                wallet: trade.traderAddress,
                timestamp: new Date(trade.timestamp).getTime()
            };
        });
        
        res.json(enrichedTrades);
    } catch (err) {
        console.error("Error fetching recent trades:", err);
        res.status(500).json({ error: 'Failed to fetch recent trades.' });
    }
});

// --- NEW: Broadcast trade to all WebSocket clients ---
function broadcastTrade(trade) {
    const tokens = db.get('tokens').value();
    const token = tokens.find(t => t.baseMint === trade.tokenMint);
    
    const tradeData = {
        type: 'newTrade',
        trade: {
            signature: trade.signature,
            tradeType: trade.type, // 'buy' or 'sell'
            tokenMint: trade.tokenMint,
            tokenName: token?.name || 'Unknown',
            tokenSymbol: token?.symbol || '???',
            tokenLogo: token?.imageUrl ? `/token-image?url=${encodeURIComponent(token.imageUrl)}` : 'depump.png',
            solAmount: trade.solVolume || 0,
            wallet: trade.traderAddress,
            timestamp: Date.now()
        }
    };
    
    // Broadcast to ALL connected clients (not just room-specific)
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(tradeData));
        }
    });
    
    console.log(`📡 Broadcasted ${trade.type} trade: ${token?.symbol || trade.tokenMint.slice(0,6)}`);
}

// --- NEW: Combined Export Endpoint for Top 50 Traders + Top 100 Holders with Merged Earnings ---
app.get('/api/export-rewards', async (req, res) => {
    try {
        const ZCOIN_MINT = 'DQSmLyJgGyw83J3WhuVBzaFBRT2xaqF4mwkC9QD4o2AU'; // Your $zCoin mint

        // 1. Fetch Top 50 Traders (from leaderboard API, page=1, limit=50)
        const tradersRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/leaderboard?page=1&limit=50`); // Adjust URL if needed
        if (!tradersRes.ok) throw new Error('Failed to fetch traders');
        const { leaderboard: traders } = await tradersRes.json();

        // Calculate trader earnings (from your existing logic: equal share for top 50)
        const TRADER_EARNINGS_PER = 50.97; // As per your example; adjust dynamically if needed
        traders.forEach(trader => {
            trader.earnings = TRADER_EARNINGS_PER;
            trader.source = 'trader';
        });

        // 2. Fetch Top 100 Holders (from your existing holders API)
        const holdersRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/top-holders/${ZCOIN_MINT}`);
        if (!holdersRes.ok) throw new Error('Failed to fetch holders');
        const holders = await holdersRes.json();

        // Use the estimatedEarnings from holders (already calculated in fetchTopHoldersWithEarnings)
        holders.forEach(holder => {
            holder.earnings = holder.estimatedEarnings || 0;
            holder.source = 'holder';
        });

        // 3. Merge: Combine traders and holders, sum earnings for duplicates
        const allWallets = [...traders, ...holders];
        const walletMap = new Map();

        allWallets.forEach(wallet => {
            const key = wallet.walletAddress || wallet.address; // Normalize key (traders use walletAddress, holders use address)
            if (!key) return; // Skip invalid

            if (walletMap.has(key)) {
                // Duplicate: Sum earnings
                const existing = walletMap.get(key);
                existing.earnings += wallet.earnings;
                existing.sources = [...(existing.sources || []), wallet.source]; // Track sources for info
            } else {
                // New: Add with normalized fields
                walletMap.set(key, {
                    address: key,
                    nickname: wallet.nickname || null,
                    earnings: wallet.earnings,
                    sources: [wallet.source],
                    amount: wallet.amount || 0, // From holders if available
                    points: wallet.totalPoints || 0 // From traders if available
                });
            }
        });

        // Convert back to array and sort by total earnings descending
        let mergedWallets = Array.from(walletMap.values()).sort((a, b) => b.earnings - a.earnings);

        // 4. Generate CSV (easy for download)
        const csvHeader = 'Address,Nickname,Earnings (USD),Sources,Amount Held,Points\n';
        const csvRows = mergedWallets.map(w => 
            `"${w.address}","${w.nickname || ''}","${w.earnings.toFixed(2)}","${w.sources.join(', ')}","${w.amount.toLocaleString() || 'N/A'}","${w.points.toLocaleString() || 'N/A'}"\n`
        ).join('');

        const csvContent = csvHeader + csvRows;

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="top-traders-holders-rewards.csv"');

        res.status(200).send(csvContent);

    } catch (err) {
        console.error("Error in /api/export-rewards:", err);
        res.status(500).json({ error: 'Failed to generate export data.' });
    }
});

app.get('/api/all-pool-addresses', (req, res) => {
    console.log('[API] Request received for /api/all-pool-addresses');
    try {
        const tokens = db.get('tokens').value();
        
        // Filter out tokens that might not have a pool address and map to get the address
        const poolAddresses = tokens
            .filter(token => token.pool) // Ensure the token object has a 'pool' property
            .map(token => token.pool);   // Extract just the pool address string

        res.status(200).json(poolAddresses);
    } catch (err) {
        console.error("Error in /api/all-pool-addresses:", err);
        res.status(500).json({ error: 'Failed to retrieve pool addresses.' });
    }
});

// POST to update a user's nickname
app.post('/api/nickname', (req, res) => {
    const { walletAddress, nickname } = req.body;
    const NICKNAME_CHANGE_LIMIT = 5;

    if (!walletAddress || !nickname || nickname.trim().length === 0) {
        return res.status(400).json({ error: 'Wallet address and nickname are required.' });
    }
    if (nickname.trim().length > 20) {
        return res.status(400).json({ error: 'Nickname is too long (max 20 characters).' });
    }

    try {
        let walletProfile = db.get('wallets').find({ address: walletAddress });
        
        if (!walletProfile.value()) {
            db.get('wallets').push({ address: walletAddress, points: 0, completedQuests: [], nicknameChanges: [] }).write();
            walletProfile = db.get('wallets').find({ address: walletAddress });
        }

        const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
        let monthlyChanges = walletProfile.get('nicknameChanges').find({ month: currentMonth }).value();

        if (monthlyChanges && monthlyChanges.count >= NICKNAME_CHANGE_LIMIT) {
            return res.status(429).json({ error: `You have reached your limit of ${NICKNAME_CHANGE_LIMIT} nickname changes for this month.` });
        }

        // Update or create the monthly change record
        if (monthlyChanges) {
            db.get('wallets').find({ address: walletAddress }).get('nicknameChanges').find({ month: currentMonth }).assign({ count: monthlyChanges.count + 1 }).write();
        } else {
            db.get('wallets').find({ address: walletAddress }).get('nicknameChanges').push({ month: currentMonth, count: 1 }).write();
        }

        // Set the new nickname
        db.get('wallets').find({ address: walletAddress }).assign({ nickname: nickname.trim() }).write();

        res.json({ success: true, message: 'Nickname updated successfully.' });

    } catch (err) {
        console.error("Error updating nickname:", err);
        res.status(500).json({ error: 'Failed to update nickname.' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = (req.query.search || '').toLowerCase();

        const wallets = db.get('wallets').value();
        
        let sortedWallets = wallets
            .filter(w => w.points && w.points > 0)
            .sort((a, b) => b.points - a.points);
        
        if (searchTerm) {
            sortedWallets = sortedWallets.filter(w => 
                w.address.toLowerCase().includes(searchTerm) ||
                (w.nickname && w.nickname.toLowerCase().includes(searchTerm))
            );
        }

        const totalWallets = sortedWallets.length;
        const totalPages = Math.ceil(totalWallets / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedWallets = sortedWallets.slice(startIndex, endIndex);

        const leaderboardData = paginatedWallets.map((wallet, index) => ({
            rank: startIndex + index + 1,
            walletAddress: wallet.address,
            totalPoints: wallet.points,
            nickname: wallet.nickname || null
        }));
        
        // Fetch ZEC price and calculate trader earnings
        const zecPrice = await getZecPrice();
        let traderEarningsUsdc = 0;
        let traderEarningsZec = 0;
        
        try {
            const statsRes = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/platform-stats`);
            if (statsRes.ok) {
                const stats = await statsRes.json();
                const totalPlatformEarnings = stats.platformEarnings || 0;
                
                const communityRewardPool = totalPlatformEarnings * 0.72;
                const tradersPool = communityRewardPool * 0.225;
                traderEarningsUsdc = tradersPool / 50;
                traderEarningsZec = convertUsdcToZec(traderEarningsUsdc, zecPrice);
                
                console.log(`📊 Leaderboard: Platform $${totalPlatformEarnings.toFixed(2)} → Trader ${traderEarningsZec.toFixed(4)} ZEC ($${traderEarningsUsdc.toFixed(2)})`);
            }
        } catch (err) {
            console.error("Error fetching trader earnings:", err.message);
        }
        
        res.json({
            leaderboard: leaderboardData,
            totalPages: totalPages,
            currentPage: page,
            traderEarningsUsdc: traderEarningsUsdc,
            traderEarningsZec: traderEarningsZec,
            zecPrice: zecPrice
        });
    } catch (err) {
        console.error("Error generating leaderboard:", err);
        res.status(500).json({ error: 'Failed to generate leaderboard.' });
    }
});

async function fetchTop10Holders(tokenMint) {
    const TOP_HOLDERS_URL = `https://datapi.jup.ag/v1/holders/${tokenMint}`;

    try {
        const holdersRes = await fetch(TOP_HOLDERS_URL);
        if (!holdersRes.ok) throw new Error(`Jupiter Holders API failed with status ${holdersRes.status}`);
        const holdersData = await holdersRes.json();
        
        // Use an arbitrary 1,000,000,000 as total supply for demonstration
        const totalCoins = 1000000000;
        
        return holdersData.holders.slice(0, 10).map(holder => {
            const share = (holder.amount / totalCoins) * 100;
            return {
                address: holder.address,
                amount: holder.amount,
                share: share.toFixed(4)
            };
        });

    } catch (error) {
        console.error("Error fetching top 10 holders:", error.message);
        return [];
    }
}

// --- NEW API ENDPOINT ---
app.get('/api/top-token-holders/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        const holders = await fetchTop10Holders(tokenMint);
        res.status(200).json(holders);
    } catch (err) {
        console.error("Error fetching top holders:", err);
        res.status(500).json({ error: 'Failed to fetch top holders data.' });
    }
});

app.get('/api/top-tokens', (req, res) => {
    try {
        const tokens = db.get('tokens').value();
        const trades = db.get('trades').value();
        
        // =========================================================
        // 👉 BEGIN: FILTER BANNED TOKENS FOR FLYER
        // =========================================================
        const FORBIDDEN_WORDS = ['zerebro', 'jeffy', 'jeff yu', 'jeffyu', 'jeffy yu'];
        
        const filteredTokens = tokens.filter(t => {
            const lowerName = (t.name || '').toLowerCase();
            const lowerSymbol = (t.symbol || '').toLowerCase();
            return !FORBIDDEN_WORDS.some(word => 
                lowerName.includes(word) || lowerSymbol.includes(word)
            );
        });
        // =========================================================
        // 👈 END: FILTER BANNED TOKENS
        // =========================================================
        
        const tokenVolumes = {};
        for (const trade of trades) {
            tokenVolumes[trade.tokenMint] = (tokenVolumes[trade.tokenMint] || 0) + trade.solVolume;
        }
        
        const topTokens = filteredTokens // Use the filtered list here
            .map(token => {
                const volume = tokenVolumes[token.baseMint] || 0;
                return {
                    baseMint: token.baseMint,
                    symbol: token.symbol,
                    name: token.name,
                    volume: volume
                };
            })
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
            
        res.json(topTokens);
    } catch (err) {
        console.error("Error generating top tokens list:", err);
        res.status(500).json({ error: 'Failed to get top tokens.' });
    }
});



app.get('/api/bounties/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;
    console.log(`GET /api/bounties for wallet: ${walletAddress}`);
    const allBounties = [
        { id: 1, name: 'First Contact', description: 'Make your very first trade on a JUNKNET token.', unlocked: false },
        { id: 2, name: 'Creator', description: 'Launch your first virtual token.', unlocked: false },
        { id: 3, name: 'Launch Artisan', description: 'Launch 5 or more virtual tokens.', unlocked: false },
        { id: 4, name: 'Pioneer', description: 'Trade a token when it has less than 50 holders.', unlocked: false },
        { id: 5, name: 'Whale Trader', description: 'Trade over 100 SOL in total volume.', unlocked: false },
    ];
    if (walletAddress.startsWith('DDx')) {
        allBounties[0].unlocked = true;
        allBounties[1].unlocked = true;
    }
    res.json(allBounties);
});

app.post('/confirm-creation', async (req, res) => {
    try {
        const { signature, baseMint, quote, deployer, name, symbol, description, keypairFile, uri, website, twitter, imageUrl } = req.body;
        if (!signature) {
            return res.status(400).json({ error: 'Missing transaction signature' });
        }

        // --- NEW: Retry logic to handle RPC lag ---
        let tx = null;
        let attempts = 0;
        while (!tx && attempts < 5) {
            console.log(`[CONFIRM] Attempt ${attempts + 1}: Fetching transaction ${signature}`);
            try {
                tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
            } catch (error) {
                console.warn(`[CONFIRM] Attempt ${attempts + 1} failed to fetch tx, retrying...`, error.message);
            }
            if (!tx) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
            }
        }
        
        if (!tx) {
            console.error(`[CONFIRM] FAILED: Transaction ${signature} not found after multiple attempts.`);
            throw new Error("Transaction not found on-chain after multiple retries. Could not confirm pool creation.");
        }
        // --- END of new logic ---

        const accountKeys = tx.transaction.message.accountKeys.map(key => key.toString());
        let correctPoolAddress = null;
        const initInstruction = tx.transaction.message.instructions.find(ix => {
            const programId = accountKeys[ix.programIdIndex];
            return programId === 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN' && ix.accounts.length > 10;
        });

        if (initInstruction) {
            correctPoolAddress = accountKeys[initInstruction.accounts[5]];
        }

        if (!correctPoolAddress) {
            throw new Error("Could not find pool address in transaction instructions.");
        }

        console.log(`[CONFIRM] Found correct pool address from instructions: ${correctPoolAddress}`);
        let walletProfile = db.get('wallets').find({ address: deployer });
        if (!walletProfile.value()) {
            db.get('wallets').push({ address: deployer, points: 0, totalVolumeSol: 0, completedQuests: [], profitableFlips: 0, deployedCount: 0 }).write();
            walletProfile = db.get('wallets').find({ address: deployer });
        }

        const newDeployedCount = (walletProfile.value().deployedCount || 0) + 1;
        walletProfile.assign({ deployedCount: newDeployedCount }).write();

        // Check for "The Creator" quest (updated ID)
        const creatorQuest = masterQuests.find(q => q.id === 'FIRST_LAUNCH');
        if (creatorQuest && !walletProfile.value().completedQuests.includes('FIRST_LAUNCH')) {
            walletProfile.get('completedQuests').push('FIRST_LAUNCH').write();
            walletProfile.update('points', p => (p || 0) + creatorQuest.points).write();
            console.log(`🎉 Quest Complete! ${deployer} unlocked '${creatorQuest.title}'!`);
        }

        // Check for "Serial Launcher" quest (updated ID)
        const artisanQuest = masterQuests.find(q => q.id === 'SERIAL_LAUNCHER');
        if (artisanQuest && newDeployedCount >= 5 && !walletProfile.value().completedQuests.includes('SERIAL_LAUNCHER')) {
            walletProfile.get('completedQuests').push('SERIAL_LAUNCHER').write();
            walletProfile.update('points', p => (p || 0) + artisanQuest.points).write();
            console.log(`🎉 Quest Complete! ${deployer} unlocked '${artisanQuest.title}'!`);
        }

        const vanityDir = path.join(process.env.RENDER ? '/data' : __dirname, 'vanity');
        const usedDir = path.join(vanityDir, 'used');
        const keypairPath = path.join(vanityDir, keypairFile);
        if (fs.existsSync(keypairPath)) {
            if (!fs.existsSync(usedDir)) {
                fs.mkdirSync(usedDir, { recursive: true });
            }
            fs.renameSync(keypairPath, path.join(usedDir, keypairFile));
        }

        db.get('tokens').push({ 
            baseMint, 
            quote, 
            deployer, 
            name, 
            symbol, 
            description: description || '', // Add description with fallback to empty string
            pool: correctPoolAddress,
            uri, 
            website, 
            twitter,
            // Add imageUrl with a fallback to ensure it's never undefined
            imageUrl: imageUrl || 'https://arweave.net/WCM5h_34E8m3y_k-h1i59Q_P5I54k-H2d_s4b-C3xZM',
            createdAt: new Date().toISOString(),
            migrated: false  // Track migration status
        }).write();
        
        res.status(200).json({ success: true, poolAddress: correctPoolAddress });
    } catch (err) {
        console.error("Error in /confirm-creation:", err);
        res.status(500).json({ error: err.message });
    }
});

// ... (rest of the endpoints: /platform-stats, /api/profile/:walletAddress, etc. are unchanged)
app.get('/platform-stats', async (req, res) => {
    try {
        const tokens = db.get('tokens').value();
        const trades = db.get('trades').value(); // Get all trades
        
        // =========================================================
        // 👉 BEGIN: FILTER BANNED TOKENS FOR STATS
        // =========================================================
        const FORBIDDEN_WORDS = ['zerebro', 'jeffy', 'jeff yu', 'jeffyu', 'jeffy yu'];
        
        const filteredTokens = tokens.filter(t => {
            const lowerName = (t.name || '').toLowerCase();
            const lowerSymbol = (t.symbol || '').toLowerCase();
            return !FORBIDDEN_WORDS.some(word => 
                lowerName.includes(word) || lowerSymbol.includes(word)
            );
        });
        
        const enrichedTokens = await Promise.all(filteredTokens.map(enrichWithJupiterData));
        // =========================================================
        // 👈 END: FILTER BANNED TOKENS
        // =========================================================
        
        // Existing calculations
        const totalTokens = enrichedTokens.length;
        const totalVolume24h = enrichedTokens.reduce((sum, token) => sum + (token.stats24h?.buyVolume ?? 0), 0);
        const totalLiquidity = enrichedTokens.reduce((sum, token) => sum + (token.liquidity ?? 0), 0);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const newTokens24h = enrichedTokens.filter(t => t.createdAt && new Date(t.createdAt) > oneDayAgo).length;

        // --- NEW CALCULATIONS ---
        const totalVolumeAllTime = trades.reduce((sum, trade) => sum + (trade.usdVolume || 0), 0);
        const platformEarnings = totalVolumeAllTime * 0.013; // ($25 earnings / $1600 volume)

        // Leaderboard calculations (using enrichedTokens - which is already filtered)
        const sortedByVolume = [...enrichedTokens].sort((a, b) => (b.stats24h?.buyVolume ?? 0) - (a.stats24h?.buyVolume ?? 0));
        const top5ByVolume = sortedByVolume.slice(0, 5).map(t => ({ name: t.name, symbol: t.symbol, volume: t.stats24h?.buyVolume ?? 0, imageUrl: t.imageUrl }));
        const sortedByMarketCap = [...enrichedTokens].sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0));
        const top5ByMarketCap = sortedByMarketCap.slice(0, 5).map(t => ({ name: t.name, symbol: t.symbol, mcap: t.mcap ?? 0, imageUrl: t.imageUrl }));

        res.status(200).json({
            totalTokens,
            totalVolume24h,
            totalLiquidity,
            newTokens24h,
            top5ByVolume,
            top5ByMarketCap,
            platformEarnings // <-- SEND NEW DATA
        });
    } catch (err) {
        console.error("Error in /platform-stats:", err);
        res.status(500).json({ error: "Failed to generate platform stats." });
    }
});

const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};

app.get('/api/profile/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    if (!walletAddress || walletAddress === 'none') {
        return res.status(404).json({ error: "Profile not found" });
    }
    try {
        const walletProfile = db.get('wallets').find({ address: walletAddress }).value();
        const quests = db.get('quests').value();
        const unlockedAchievements = walletProfile?.completedQuests?.map(questId => {
            return quests.find(q => q.id === questId);
        }).filter(Boolean) || [];
        const recentActivity = db.get('trades')
            .filter({ traderAddress: walletAddress })
            .orderBy('timestamp', 'desc')
            .take(10)
            .value();
        const junknetTokens = db.get('tokens').value();
        let currentHoldings = [];
        for (const token of junknetTokens) {
            try {
                const holderRes = await fetch(`https://datapi.jup.ag/v1/holders/${token.baseMint}`);
                if (holderRes.ok) {
                    const data = await holderRes.json();
                    const userHolding = data.holders.find(h => h.address === walletAddress);
                    if (userHolding && userHolding.amount > 0) {
                        currentHoldings.push({
                            token: `${token.name} (${token.symbol})`,
                            balance: userHolding.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        });
                    }
                }
            } catch (e) {
                console.error(`Could not fetch holders for ${token.baseMint}: ${e.message}`);
            }
        }
        const responseData = {
            walletAddress: walletAddress,
            flippingScore: walletProfile?.flippingScore || 0,
            totalPnlSol: walletProfile?.totalPnlSol || 0,
            totalVolumeSol: walletProfile?.totalVolumeSol || 0,
            currentHoldings: currentHoldings.length > 0 ? currentHoldings : [{ token: "No current holdings on JUNKNET", balance: "N/A" }],
            unlockedAchievements: unlockedAchievements,
            recentActivity: recentActivity
        };
        res.json(responseData);
    } catch (err) {
        console.error(`Failed to get profile for ${walletAddress}:`, err);
        res.status(500).json({ error: 'Failed to get profile data.' });
    }
});

app.get('/historical-stats', async (req, res) => {
    try {
        const tokens = db.get('tokens').value();
        const enrichedTokens = await Promise.all(tokens.map(enrichWithJupiterData));
        const statsByDay = {};
        enrichedTokens.forEach(token => {
            if (token.createdAt) {
                const date = formatDate(token.createdAt);
                if (!statsByDay[date]) {
                    statsByDay[date] = { volume: 0, tvl: 0, newTokens: 0 };
                }
                statsByDay[date].volume += token.stats24h?.buyVolume ?? 0;
                statsByDay[date].tvl += token.liquidity ?? 0;
                statsByDay[date].newTokens += 1;
            }
        });
        const sortedDates = Object.keys(statsByDay).sort((a, b) => new Date(a) - new Date(b));
        const labels = [];
        const volumeData = [];
        const tvlData = [];
        const deployedData = [];
        let cumulativeTokens = 0;
        sortedDates.forEach(date => {
            cumulativeTokens += statsByDay[date].newTokens;
            labels.push(date);
            volumeData.push(statsByDay[date].volume);
            tvlData.push(statsByDay[date].tvl);
            deployedData.push(cumulativeTokens);
        });
        res.status(200).json({
            labels,
            volumeData,
            tvlData,
            deployedData
        });
    } catch (err) {
        console.error("Error in /historical-stats:", err);
        res.status(500).json({ error: "Failed to get historical stats." });
    }
});

// --- REAL-TIME CHAT (WEBSOCKETS) ---
const wss = new WebSocketServer({ server });
wss.on('connection', ws => {
    console.log('Client connected to WebSocket');
    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            
            // Regular chat subscription
            if (data.type === 'subscribe') {
                const { token } = data;
                clientRooms.set(ws, token);
                if (!chatRooms.has(token)) chatRooms.set(token, []);
                ws.send(JSON.stringify({ type: 'history', messages: chatRooms.get(token) }));
            }
            
            // Agentic Terminal subscription
            if (data.type === 'subscribe_agentic') {
                const { tokenMint } = data;
                if (!terminalSubscribers.has(tokenMint)) {
                    terminalSubscribers.set(tokenMint, []);
                }
                terminalSubscribers.get(tokenMint).push(ws);
                ws.agenticTokenMint = tokenMint; // Store for cleanup
                
                // Send current history
                const terminal = agenticTerminals.get(tokenMint);
                if (terminal) {
                    ws.send(JSON.stringify({
                        type: 'agentic_history',
                        tokenMint: tokenMint,
                        history: terminal.getHistory()
                    }));
                }
                console.log(`Client subscribed to agentic terminal: ${tokenMint}`);
            }
            
            // Unsubscribe from agentic terminal
            if (data.type === 'unsubscribe_agentic') {
                const { tokenMint } = data;
                const subscribers = terminalSubscribers.get(tokenMint) || [];
                terminalSubscribers.set(tokenMint, subscribers.filter(s => s !== ws));
                ws.agenticTokenMint = null;
            }
            
            if (data.type === 'chatMessage') {
                const token = clientRooms.get(ws);
                if (token) {
                    const newMessage = { wallet: data.wallet, text: data.text, timestamp: Date.now() };
                    chatRooms.get(token).push(newMessage);
                    for (const [client, room] of clientRooms.entries()) {
                        if (room === token && client.readyState === ws.OPEN) {
                            client.send(JSON.stringify({ type: 'newMessage', message: newMessage }));
                        }
                    }
                }
            }
        } catch (e) { console.error('WS message error:', e); }
    });
    ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
        clientRooms.delete(ws);
        
        // Clean up agentic subscriptions
        if (ws.agenticTokenMint) {
            const subscribers = terminalSubscribers.get(ws.agenticTokenMint) || [];
            terminalSubscribers.set(ws.agenticTokenMint, subscribers.filter(s => s !== ws));
        }
    });
});

setInterval(() => {
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
    for (const [token, messages] of chatRooms.entries()) {
        chatRooms.set(token, messages.filter(msg => msg.timestamp > twoMinutesAgo));
    }
}, 30000);

// --- NEW: Top Holders Logic and API Endpoint ---
// --- NEW: Top Holders Logic and API Endpoint ---
// --- UPDATED: Full fetchTopHoldersWithEarnings Function with Dynamic Total Pool ---
// --- UPDATED: Full fetchTopHoldersWithEarnings Function with Dynamic Total Pool & Array Safety ---
async function fetchTopHoldersWithEarnings(tokenMint) {
    const TOP_HOLDERS_URL = `https://datapi.jup.ag/v1/holders/${tokenMint}`;
    
    const TRADERS_COUNT = 50;
    const HOLDERS_COUNT = 100;
    const PENALTY_PER_HOLDER = 3; // -$4 per holder

    try {
        // 1. Fetch ZEC price first
        const zecPrice = await getZecPrice();
        
        // 2. Fetch live platform earnings
        const internalApiUrl = `http://127.0.0.1:${process.env.PORT || 3000}/platform-stats`;
        const statsRes = await fetch(internalApiUrl); 
        if (!statsRes.ok) {
            throw new Error(`Internal API call to /platform-stats failed`);
        }
        const stats = await statsRes.json();
        
        const totalPlatformEarnings = stats.platformEarnings || 0;
        
        // 3. Calculate community reward pool (75% of platform earnings)
        const communityRewardPool = totalPlatformEarnings * 0.70;
        
        // 4. Split community pool between traders (42.5%) and holders (57.5%)
        const tradersPool = communityRewardPool * 0.25;
        const holdersPool = communityRewardPool * 0.40;
        
        // 5. Calculate per-person rewards in USDC
        const TRADER_EARNINGS_PER_USDC = tradersPool / TRADERS_COUNT;
        const perHolderBeforePenalty = holdersPool / HOLDERS_COUNT;
        const FINAL_PER_HOLDER_USDC = Math.max(0, perHolderBeforePenalty - PENALTY_PER_HOLDER);
        
        // 6. Convert to ZEC (with $1 penalty applied in the conversion function)
        const TRADER_EARNINGS_ZEC = convertUsdcToZec(TRADER_EARNINGS_PER_USDC, zecPrice);
        const HOLDER_EARNINGS_ZEC = convertUsdcToZec(FINAL_PER_HOLDER_USDC, zecPrice);
        
        console.log(`💰 Platform Earnings: $${totalPlatformEarnings.toFixed(2)}`);
        console.log(`💰 Community Pool: $${communityRewardPool.toFixed(2)}`);
        console.log(`📊 Traders: ${TRADERS_COUNT} @ ${TRADER_EARNINGS_ZEC.toFixed(4)} ZEC ($${TRADER_EARNINGS_PER_USDC.toFixed(2)}) each`);
        console.log(`📊 Holders: ${HOLDERS_COUNT} @ ${HOLDER_EARNINGS_ZEC.toFixed(4)} ZEC ($${FINAL_PER_HOLDER_USDC.toFixed(2)}) each`);
        console.log(`💵 ZEC Price: $${zecPrice.toFixed(2)}`);

        // 7. Fetch holders data
        const holdersRes = await fetch(TOP_HOLDERS_URL);
        if (!holdersRes.ok) {
            throw new Error(`Jupiter Holders API failed with status ${holdersRes.status}`);
        }
        const holdersData = await holdersRes.json();
        
        let rawHoldersArray = [];
        if (holdersData && Array.isArray(holdersData.holders)) {
            rawHoldersArray = holdersData.holders;
        }
        
        const top100 = rawHoldersArray.slice(0, HOLDERS_COUNT);
        
        const holdersWithEarnings = top100.map((holder, index) => ({
            address: holder.address || `UnknownHolder${index + 1}`,
            amount: holder.amount || 0,
            amountDisplay: holder.amountDisplay || '0', 
            estimatedEarningsUsdc: FINAL_PER_HOLDER_USDC,
            estimatedEarningsZec: HOLDER_EARNINGS_ZEC,
            zecDisplay: `${HOLDER_EARNINGS_ZEC.toFixed(4)} $ZEC 🪙`,
            usdDisplay: `$${FINAL_PER_HOLDER_USDC.toFixed(2)} USDC 💵`,
            isPool: (holder.name && holder.name.toLowerCase().includes('pool')) || false 
        }));

        const TOTAL_HOLDERS_POOL_USDC = FINAL_PER_HOLDER_USDC * HOLDERS_COUNT;
        const TOTAL_HOLDERS_POOL_ZEC = HOLDER_EARNINGS_ZEC * HOLDERS_COUNT;

        return {
            holders: holdersWithEarnings,
            totalPoolUsdc: TOTAL_HOLDERS_POOL_USDC,
            totalPoolZec: TOTAL_HOLDERS_POOL_ZEC,
            perHolderUsdc: FINAL_PER_HOLDER_USDC,
            perHolderZec: HOLDER_EARNINGS_ZEC,
            traderEarningsUsdc: TRADER_EARNINGS_PER_USDC,
            traderEarningsZec: TRADER_EARNINGS_ZEC,
            platformEarnings: totalPlatformEarnings,
            zecPrice: zecPrice
        };

    } catch (error) {
        console.error("Error in fetchTopHoldersWithEarnings:", error.message);
        
        const fallbackZecPrice = cachedZecPrice || 577;
        const fallbackPerHolderUsdc = 0;
        const fallbackPerHolderZec = 0;
        const fallbackPerTraderUsdc = 0;
        const fallbackPerTraderZec = 0;
        
        const fallbackHolders = Array.from({ length: Math.min(HOLDERS_COUNT, 100) }, (_, i) => ({
            address: `FallbackHolder${i + 1}`,
            amount: 0,
            amountDisplay: '0',
            estimatedEarningsUsdc: fallbackPerHolderUsdc,
            estimatedEarningsZec: fallbackPerHolderZec,
            zecDisplay: `${fallbackPerHolderZec.toFixed(4)} $ZEC 🪙`,
            usdDisplay: `$${fallbackPerHolderUsdc.toFixed(2)} USDC 💵`,
            isPool: false
        }));
        
        return {
            holders: fallbackHolders,
            totalPoolUsdc: 0,
            totalPoolZec: 0,
            perHolderUsdc: fallbackPerHolderUsdc,
            perHolderZec: fallbackPerHolderZec,
            traderEarningsUsdc: fallbackPerTraderUsdc,
            traderEarningsZec: fallbackPerTraderZec,
            zecPrice: fallbackZecPrice
        };
    }
}

// Portfolio endpoint
app.get('/api/portfolio/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    
    try {
        const trades = db.get('trades').filter({ traderAddress: walletAddress }).value();
        const tokens = db.get('tokens').value();
        
        // Group by token
        const holdings = {};
        
        for (const trade of trades) {
            if (!holdings[trade.tokenMint]) {
                holdings[trade.tokenMint] = {
                    mint: trade.tokenMint,
                    token: tokens.find(t => t.baseMint === trade.tokenMint),
                    totalBought: 0,
                    totalSold: 0,
                    totalBuyCost: 0,
                    totalSellRevenue: 0
                };
            }
            
            if (trade.type === 'buy') {
                holdings[trade.tokenMint].totalBought += trade.solVolume;
                holdings[trade.tokenMint].totalBuyCost += trade.usdVolume || 0;
            } else {
                holdings[trade.tokenMint].totalSold += trade.solVolume;
                holdings[trade.tokenMint].totalSellRevenue += trade.usdVolume || 0;
            }
        }
        
        // Calculate P&L
        const portfolio = Object.values(holdings).map(h => ({
            ...h,
            netPosition: h.totalBought - h.totalSold,
            realizedPnl: h.totalSellRevenue - (h.totalBuyCost * (h.totalSold / h.totalBought || 0)),
            tokenName: h.token?.name || 'Unknown',
            tokenSymbol: h.token?.symbol || '???',
            tokenLogo: h.token?.imageUrl
        }));
        
        res.json({
            totalTrades: trades.length,
            portfolio: portfolio.filter(p => p.netPosition > 0 || p.realizedPnl !== 0)
        });
        
    } catch (err) {
        console.error('Portfolio error:', err);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// --- UPDATED: /api/top-holders Endpoint (Safe Wrapper Around the Function) ---
app.get('/api/top-holders/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;
        const ZCOIN_MINT = 'DQSmLyJgGyw83J3WhuVBzaFBRT2xaqF4mwkC9QD4o2AU';
        
        // Use the ZCOIN_MINT for rewards calc, but allow querying other mints for holders
        let data = await fetchTopHoldersWithEarnings(ZCOIN_MINT);  // Always use ZCOIN for earnings logic
        
        // If a different mint was queried, override holders with that mint's data (but keep earnings from ZCOIN)
        if (tokenMint !== ZCOIN_MINT) {
            try {
                const customHoldersRes = await fetch(`https://datapi.jup.ag/v1/holders/${tokenMint}`);
                if (customHoldersRes.ok) {
                    const customHoldersData = await customHoldersRes.json();
                    // FIXED: Ensure custom data is also an array
                    const rawCustomArray = Array.isArray(customHoldersData.holders) ? customHoldersData.holders : [];
                    const top100Custom = rawCustomArray.slice(0, 100);
                    
                    data.holders = top100Custom.map((holder, index) => ({
                        address: holder.address || `CustomHolder${index + 1}`,
                        amount: holder.amount || 0,
                        amountDisplay: holder.amountDisplay || '0',
                        estimatedEarnings: data.perHolder,  // Keep ZCOIN earnings
                        usdDisplay: `$${data.perHolder.toFixed(2)} USDC 💵`,
                        isPool: (holder.name && holder.name.toLowerCase().includes('pool')) || false
                    }));
                }
            } catch (customErr) {
                console.warn(`Custom holders fetch failed for ${tokenMint}:`, customErr.message);
                // Fall back to ZCOIN holders; don't crash the whole response
            }
        }

        // FIXED: Final safety check before sending (ensure holders is array)
        if (!Array.isArray(data.holders)) {
            console.error('API response holders is not an array; forcing fallback.');
            data.holders = [];
        }

        res.status(200).json(data);  // Returns { holders: [array!], totalPool: X, ... }

    } catch (err) {
        console.error("Error in /api/top-holders endpoint:", err);
        // FIXED: Error response also returns safe structure (array for holders)
        res.status(500).json({ 
            error: 'Failed to fetch top holders data.', 
            holders: [],  // Empty array to prevent frontend crash
            totalPool: 0 
        });
    }
});


// --- BACKGROUND QUEST & DATA ENGINE ---
async function getLatestTradesFromApi(tokenMint) {
    const JUPITER_API_URL = `https://datapi.jup.ag/v1/txs/${tokenMint}?limit=100`;
    try {
        const response = await fetch(JUPITER_API_URL);
        if (!response.ok) {
            throw new Error(`Jupiter Data API failed with status ${response.status}`);
        }
        const data = await response.json();
        const trades = data.txs || [];
        return trades.map(trade => ({
            signature: trade.txHash,
            timestamp: trade.timestamp,
            tokenMint: trade.asset,
            traderAddress: trade.traderAddress,
            solVolume: trade.nativeVolume,
            usdVolume: trade.usdVolume, // <-- ADD THIS LINE
            type: trade.type,
        }));
    } catch (error) {
        console.error(`Error fetching trades from Jupiter for ${tokenMint}:`, error.message);
        return [];
    }
}

async function processNewTradesForQuests(newTrades) {
    if (!newTrades || newTrades.length === 0) return;
    console.log(`⚙️ Processing ${newTrades.length} new trade(s) for quests...`);

    // 🔴 ADD THIS: Broadcast each new trade to frontend
    for (const trade of newTrades) {
        broadcastTrade(trade);
    }

    // Group trades by trader to process them efficiently
    const tradesByTrader = newTrades.reduce((acc, trade) => {
        if (trade.traderAddress) {
            if (!acc[trade.traderAddress]) {
                acc[trade.traderAddress] = [];
            }
            acc[trade.traderAddress].push(trade);
        }
        return acc;
    }, {});

    for (const traderAddress in tradesByTrader) {
        // Ensure wallet profile exists
        let walletProfile = db.get('wallets').find({ address: traderAddress });
        if (!walletProfile.value()) {
            db.get('wallets').push({
                address: traderAddress,
                points: 0,
                totalVolumeSol: 0,
                completedQuests: [],
                profitableFlips: 0,
                deployedCount: 0,
                successfulLaunches: 0, // for new quests
                snipeCount: 0, // for new quests
                profitableFlipStreak: 0, // for new quests
            }).write();
            walletProfile = db.get('wallets').find({ address: traderAddress });
        }
        const userQuests = walletProfile.value().completedQuests || [];
        const completeQuest = (questId) => {
            const quest = masterQuests.find(q => q.id === questId);
            if (quest && !userQuests.includes(questId)) {
                walletProfile.get('completedQuests').push(questId).write();
                walletProfile.update('points', p => (p || 0) + quest.points).write();
                console.log(`🎉 Quest Complete! ${traderAddress.slice(0, 6)} unlocked '${quest.title}'!`);
                userQuests.push(questId); // Update local copy to prevent re-awarding in same loop
            }
        };

        // --- UPDATE CUMULATIVE STATS FIRST ---
        const tradesForThisUser = tradesByTrader[traderAddress];
        const newVolume = tradesForThisUser.reduce((sum, t) => sum + (t.solVolume || 0), 0);
        const newTotalVolume = (walletProfile.value().totalVolumeSol || 0) + newVolume;
        walletProfile.assign({ totalVolumeSol: newTotalVolume }).write();

        // --- QUEST LOGIC ---

        // 1. First Trade
        completeQuest('FIRST_STEPS');

        // 2. Volume-based quests
        if (newTotalVolume >= 10) completeQuest('APPRENTICE_TRADER');
        if (newTotalVolume >= 100) completeQuest('JOURNEYMAN_TRADER');
        if (newTotalVolume >= 1000) completeQuest('MARKET_MAKER');
        if (newTotalVolume >= 5000) completeQuest('KINGPIN_TRADER');
        if (newTotalVolume >= 15000) completeQuest('TYCOON');

        // 3. Diversity Quests
        const allUserTrades = db.get('trades').filter({ traderAddress }).value();
        const uniqueTokensTraded = new Set(allUserTrades.map(t => t.tokenMint));
        if (uniqueTokensTraded.size >= 5) completeQuest('THE_REGULAR');
        if (uniqueTokensTraded.size >= 25) completeQuest('DIVERSIFIER');

        // 4. Per-Trade Feats (Whale, Sniper)
        for (const trade of tradesForThisUser) {
            if (trade.solVolume >= 25) completeQuest('WHALE_TRADE');

            if (trade.type === 'buy') {
                const token = db.get('tokens').find({ baseMint: trade.tokenMint }).value();
                if (!token) continue;

                // Pioneer Trader
                const uniqueBuyers = [...new Set(db.get('trades').filter({ tokenMint: trade.tokenMint, type: 'buy' }).map('traderAddress').value())];
                if (uniqueBuyers.length <= 10) completeQuest('PIONEER_TRADER');

                // Sniper & Alpha Sniper
                const launchTime = new Date(token.createdAt).getTime();
                const tradeTime = new Date(trade.timestamp).getTime();
                if (tradeTime - launchTime <= 30000) {
                    completeQuest('SNIPER');
                    const newSnipeCount = (walletProfile.value().snipeCount || 0) + 1;
                    walletProfile.assign({ snipeCount: newSnipeCount }).write();
                    if (newSnipeCount >= 5) completeQuest('ALPHA_SNIPER');
                }
            }
        }
        
        // 5. Profitability Quests (Flipper, HODLer, Giga Flip)
        for (const trade of tradesForThisUser.filter(t => t.type === 'sell')) {
            const userTradesForToken = allUserTrades.filter(t => t.tokenMint === trade.tokenMint);
            const buys = userTradesForToken.filter(t => t.type === 'buy');
            
            if (buys.length > 0) {
                const totalBuyVolume = buys.reduce((sum, b) => sum + b.solVolume, 0);
                const avgBuyVolume = totalBuyVolume / buys.length; // Simplified avg buy price
                const isProfitable = trade.solVolume > avgBuyVolume;

                if (isProfitable) {
                    const newFlipCount = (walletProfile.value().profitableFlips || 0) + 1;
                    const newStreak = (walletProfile.value().profitableFlipStreak || 0) + 1;
                    walletProfile.assign({ profitableFlips: newFlipCount, profitableFlipStreak: newStreak }).write();

                    // Standard Flipper Quests
                    if (newFlipCount >= 1) completeQuest('PROFITABLE_START');
                    if (newFlipCount >= 10) completeQuest('FLIPPER');
                    if (newFlipCount >= 50) completeQuest('MASTER_FLIPPER');
                    if (newFlipCount >= 200) completeQuest('GRANDMASTER_FLIPPER');

                    // Streak Quest
                    if (newStreak >= 5) completeQuest('STREAK_KING');

                    // HODLer Quest
                    const firstBuy = buys.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
                    if (firstBuy) {
                        const holdDuration = new Date(trade.timestamp).getTime() - new Date(firstBuy.timestamp).getTime();
                        if (holdDuration > 24 * 60 * 60 * 1000) { // 24 hours
                            completeQuest('HODLER');
                        }
                    }

                    // Giga Flip Quest
                    const netProfit = trade.solVolume - avgBuyVolume;
                    if (netProfit > 10) {
                        completeQuest('GIGA_FLIP');
                    }

                } else {
                    // Reset streak on a non-profitable trade
                    walletProfile.assign({ profitableFlipStreak: 0 }).write();
                }
            }
        }
    }
}

// This function checks for quests related to a token's market cap.
async function checkMarketCapQuests() {
    console.log(' MCap Quests Check...');
    const tokensToCheck = db.get('tokens').value();
    
    for (const token of tokensToCheck) {
        try {
            const enrichedData = await enrichWithJupiterData(token); // Use your existing caching function
            const mcap = enrichedData.mcap || 0;

            // --- DEPLOYER QUESTS ---
            const deployerProfile = db.get('wallets').find({ address: token.deployer });
            if (deployerProfile.value()) {
                const deployerQuests = deployerProfile.value().completedQuests || [];
                // Successful Launch ($10k)
                if (mcap >= 10000 && !deployerQuests.includes('SUCCESSFUL_LAUNCH')) {
                    const quest = masterQuests.find(q => q.id === 'SUCCESSFUL_LAUNCH');
                    deployerProfile.get('completedQuests').push('SUCCESSFUL_LAUNCH').write();
                    deployerProfile.update('points', p => (p || 0) + quest.points).write();
                    console.log(`🎉 Quest Complete! ${token.deployer.slice(0,6)} unlocked '${quest.title}'!`);
                }
                // Launchpad Legend ($100k)
                if (mcap >= 100000 && !deployerQuests.includes('LAUNCHPAD_LEGEND')) {
                    const quest = masterQuests.find(q => q.id === 'LAUNCHPAD_LEGEND');
                    deployerProfile.get('completedQuests').push('LAUNCHPAD_LEGEND').write();
                    deployerProfile.update('points', p => (p || 0) + quest.points).write();
                    console.log(`🎉 Quest Complete! ${token.deployer.slice(0,6)} unlocked '${quest.title}'!`);
                }
                // Legendary Launch ($1M)
                if (mcap >= 1000000 && !deployerQuests.includes('LEGENDARY_LAUNCH')) {
                    const quest = masterQuests.find(q => q.id === 'LEGENDARY_LAUNCH');
                    deployerProfile.get('completedQuests').push('LEGENDARY_LAUNCH').write();
                    deployerProfile.update('points', p => (p || 0) + quest.points).write();
                    console.log(`🎉 Quest Complete! ${token.deployer.slice(0,6)} unlocked '${quest.title}'!`);
                }
            }
            
            // --- UNICORN HUNTER QUEST ($100k) ---
            if (mcap >= 100000 && !token.unicornHunterAwarded) {
                const quest = masterQuests.find(q => q.id === 'UNICORN_HUNTER');
                const earlyBuyers = [...new Set(db.get('trades').filter({ tokenMint: token.baseMint, type: 'buy' }).orderBy('timestamp', 'asc').map('traderAddress').value())].slice(0, 50);
                
                for (const buyerAddress of earlyBuyers) {
                    const buyerProfile = db.get('wallets').find({ address: buyerAddress });
                    if (buyerProfile.value() && !buyerProfile.value().completedQuests.includes('UNICORN_HUNTER')) {
                        buyerProfile.get('completedQuests').push('UNICORN_HUNTER').write();
                        buyerProfile.update('points', p => (p || 0) + quest.points).write();
                        console.log(`🎉 Quest Complete! ${buyerAddress.slice(0,6)} unlocked '${quest.title}'!`);
                    }
                }
                // Mark token so we don't re-award this quest
                db.get('tokens').find({ baseMint: token.baseMint }).assign({ unicornHunterAwarded: true }).write();
            }

        } catch (error) {
            console.error(`Error checking MCap quests for ${token.symbol}:`, error.message);
        }
    }
}

// This function checks for quests related to leaderboard ranking.
async function checkLeaderboardQuests() {
    console.log(' Leaderboard Quests Check...');
    try {
        const quest = masterQuests.find(q => q.id === 'TOP_TEN_TRADER');
        if (!quest) return;

        const topTenWallets = db.get('wallets')
            .filter(w => w.points > 0)
            .orderBy('points', 'desc')
            .take(10)
            .map('address')
            .value();

        for (const walletAddress of topTenWallets) {
            const walletProfile = db.get('wallets').find({ address: walletAddress });
            if (walletProfile.value() && !walletProfile.value().completedQuests.includes('TOP_TEN_TRADER')) {
                walletProfile.get('completedQuests').push('TOP_TEN_TRADER').write();
                walletProfile.update('points', p => (p || 0) + quest.points).write();
                console.log(`🎉 Quest Complete! ${walletAddress.slice(0,6)} unlocked '${quest.title}'!`);
            }
        }
    } catch (error) {
        console.error("Error checking leaderboard quests:", error.message);
    }
}

app.get('/backup-4c47403e-6294-4192-8a66-aaacb94085f1/db.json', (req, res) => {
    console.log('✅ Initiating database backup download...');
    const dbPath = process.env.RENDER ? '/data/db.json' : 'db.json';

    // Use res.download() to send the file and prompt a download
    res.download(dbPath, 'db.json', (err) => {
        if (err) {
            console.error('❌ Error sending backup file:', err);
            // If the download fails, send a clean error to the browser
            if (!res.headersSent) {
                res.status(500).send('Error: Could not download the database file.');
            }
        } else {
            console.log('✅ Backup file sent successfully.');
        }
    });
});

// Add these to your intervals at the bottom of the file
setInterval(checkMarketCapQuests, 5 * 60 * 1000); // Check every 5 minutes
setInterval(checkLeaderboardQuests, 60 * 60 * 1000); // Check every hour

async function updateDataEngine() {
    console.log('⚙️  Running data engine cycle...');
    try {
        const allPlatformTokens = db.get('tokens').value();
        for (const token of allPlatformTokens) {
            const latestTrades = await getLatestTradesFromApi(token.baseMint);
            if (latestTrades.length === 0) {
                continue;
            }
            const existingSignatures = new Set(db.get('trades').map('signature').value());
            const newUniqueTrades = latestTrades.filter(trade => !existingSignatures.has(trade.signature));
            if (newUniqueTrades.length > 0) {
                db.get('trades').push(...newUniqueTrades).write();
                await processNewTradesForQuests(newUniqueTrades);
            }
        }
    } catch (error) {
        console.error("Error during data engine cycle:", error);
    }
}
setInterval(updateDataEngine, 30 * 1000);

// --- AUTO-MIGRATION ENGINE (NEW) ---
const DAMM_V2_MIGRATION_FEE_ADDRESSES = [
    new PublicKey('8f848CEy8eY6PhJ3VcemtBDzPPSD4Vq7aJczLZ3o8MmX'), // 25bps
    new PublicKey('8f848CEy8eY6PhJ3VcemtBDzPPSD4Vq7aJczLZ3o8MmX'), // 30bps (adjust per docs for customizable 0 fee)
    // ... add all from SDK docs; use index 6 for customizable 0 fee
];
const CUSTOMIZABLE_DAMM_V2_CONFIG = DAMM_V2_MIGRATION_FEE_ADDRESSES[6] || new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'); // Default for 0 fee

// --- AUTO-MIGRATION ENGINE (NEW & SIMPLIFIED) ---
async function autoMigratePools() {
    console.log('🔄 Checking for graduated pools...');
    try {
        // 1. Get all tokens that are not yet marked as migrated in our database.
        const tokensToCheck = db.get('tokens').filter({ migrated: false }).value();

        for (const token of tokensToCheck) {
            if (!token.pool) continue; // Skip if there's no pool address

            const virtualPool = new PublicKey(token.pool);
            
            // 2. Check the pool's curve progress directly from the SDK.
            const progress = await client.state.getPoolCurveProgress(virtualPool);
            console.log(`Pool ${token.symbol} (${token.pool.slice(0,4)}...) progress: ${(progress * 100).toFixed(2)}%`);

            // 3. If the curve is 100% full, simply update our database.
            //    No need to send any transactions.
            if (progress >= 1) {
                console.log(`✅ Marking token ${token.symbol} as graduated!`);
                db.get('tokens')
                  .find({ baseMint: token.baseMint })
                  .assign({ migrated: true, migratedAt: new Date().toISOString() })
                  .write();
            }
        }
    } catch (error) {
        // We log the error but don't crash the server. It will try again on the next interval.
        console.error('Auto-migration check error:', error.message);
    }
}

// Run auto-migration check every 30 seconds (this interval is unchanged)
setInterval(autoMigratePools, 30 * 1000);

function broadcast(token, message) {
    for (const [client, room] of clientRooms.entries()) {
        if (room === token && client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    }
}

// ... (rest of the endpoints: /quote-fees, /claim-fees, etc. are unchanged)
app.post('/quote-fees', async (req, res) => {
    const { poolAddresses } = req.body;
    if (!poolAddresses || !Array.isArray(poolAddresses)) {
        return res.status(400).json({ error: 'poolAddresses must be an array.' });
    }
    const FEE_QUOTE_URL = 'https://studio-api.jup.ag/dbc/fee';
    const feeQuotes = {};
    for (const poolAddress of poolAddresses) {
        try {
            const response = await fetch(FEE_QUOTE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poolAddress }),
            });
            if (response.ok) {
                const quote = await response.json();
                feeQuotes[poolAddress] = Number(quote.unclaimed ?? 0);
            } else {
                feeQuotes[poolAddress] = 0;
            }
        } catch (error) {
            console.error(`Failed to fetch fee for pool ${poolAddress}:`, error);
            feeQuotes[poolAddress] = 0;
        }
    }
    res.status(200).json(feeQuotes);
});

app.post('/claim-fees', async (req, res) => {
    const { poolAddress, ownerWallet } = req.body;
    console.log(`[CLAIM-FEES] Received request for pool: ${poolAddress} by owner: ${ownerWallet}`);
    if (!poolAddress || !ownerWallet) {
        return res.status(400).json({ error: 'Missing poolAddress or ownerWallet' });
    }
    const FEE_QUOTE_URL = 'https://studio-api.jup.ag/dbc/fee';
    const CREATE_TX_URL = 'https://studio-api.jup.ag/dbc/fee/create-tx';
    try {
        const quoteResponse = await fetch(FEE_QUOTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poolAddress }),
        });
        if (!quoteResponse.ok) {
            const errorText = await quoteResponse.text();
            throw new Error(`Failed to get fee quote from Jupiter API: ${errorText}`);
        }
        const quote = await quoteResponse.json();
        const unclaimedAmount = Number(quote.unclaimed ?? 0);
        if (!unclaimedAmount || unclaimedAmount <= 0) {
            return res.status(400).json({ error: 'There are no fees to claim at this time.' });
        }
        const createTxResponse = await fetch(CREATE_TX_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                poolAddress,
                ownerWallet,
                maxQuoteAmount: unclaimedAmount,
            }),
        });
        if (!createTxResponse.ok) {
            const errorText = await createTxResponse.text();
            throw new Error(`Failed to create claim transaction via Jupiter API: ${errorText}`);
        }
        const txData = await createTxResponse.json();
        const base64Transaction = txData.transaction || txData.tx;
        if (!base64Transaction) {
            throw new Error('No transaction was returned from the Jupiter API.');
        }
        res.status(200).json({ transaction: base64Transaction });
    } catch (err) {
        console.error("Error in /claim-fees endpoint:", err);
        res.status(500).json({ error: err.message });
    }
});

const pick = (obj, path, fallback = null) => {
    try {
        return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj) ?? fallback;
    } catch {
        return fallback;
    }
};

async function enrichWithJupiterData(token) {
    const defaultImage = 'https://arweave.net/WCM5h_34E8m3y_k-h1i59Q_P5I54k-H2d_s4b-C3xZM';
    const now = Date.now();
    const cacheKey = token.baseMint;
    const cachedItem = jupiterCache.get(cacheKey);
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION_MS)) {
        return { ...token, ...cachedItem.data };
    }
    try {
        const jupRes = await fetch(`https://datapi.jup.ag/v1/assets/search?query=${token.baseMint}`);
        if (!jupRes.ok) throw new Error('Failed to fetch Jupiter data');
        const arr = await jupRes.json();
        const j = arr?.[0];
        let enrichedData = {};
        if (j) {
            enrichedData = {
                id: j.id || token.baseMint,
                name: j.name ?? token.name,
                symbol: j.symbol ?? token.symbol,
                imageUrl: j.icon || token.imageUrl || defaultImage,
                website: (j.extensions?.website) || token.website,
                twitter: (j.extensions?.twitter) || token.twitter,
                telegram: (j.extensions?.telegram) || token.telegram,
                createdAt: j.createdAt ?? token.createdAt ?? null,
                usdPrice: j.usdPrice ?? null,
                mcap: j.mcap ?? 0,
                liquidity: j.liquidity ?? 0,
                holderCount: j.holderCount ?? 0,
                stats24h: j.stats24h || null,
                audit: j.audit || {},
            };
        } else {
            enrichedData = { imageUrl: defaultImage, mcap: 0, liquidity: 0, holderCount: 0, stats24h: null, audit: {} };
        }
        jupiterCache.set(cacheKey, { data: enrichedData, timestamp: now });
        return { ...token, ...enrichedData };
    } catch (err) {
        console.error(`Error enriching token ${token.baseMint}: ${err.message}`);
        if (cachedItem) {
            return { ...token, ...cachedItem.data };
        }
        return { ...token, imageUrl: defaultImage, mcap: 0, liquidity: 0, holderCount: 0, stats24h: null };
    }
}

// ... (rest of the endpoints: /api/quests, /api/wallet/:address, etc. are unchanged)
app.get('/api/quests', (req, res) => {
    res.json(masterQuests);
});

app.get('/api/wallet/:address', (req, res) => {
    const { address } = req.params;
    const walletProfile = db.get('wallets').find({ address }).value();
    if (walletProfile) {
        res.json(walletProfile);
    } else {
        res.json({
            address: address,
            points: 0,
            totalVolumeSol: 0,
            completedQuests: []
        });
    }
});

app.get('/all-tokens', async (req, res) => {
    try {
        const tokens = db.get('tokens').value();

        // =========================================================
        // 👉 BEGIN: GLOBAL FILTER FOR BANNED TOKENS (ALL VIEWS)
        // =========================================================
        const FORBIDDEN_WORDS = ['zerebro', 'jeffy', 'jeff yu', 'jeffyu', 'jeffy yu'];
        
        const filteredTokens = tokens.filter(t => {
            const lowerName = (t.name || '').toLowerCase();
            const lowerSymbol = (t.symbol || '').toLowerCase();
            return !FORBIDDEN_WORDS.some(word => 
                lowerName.includes(word) || lowerSymbol.includes(word)
            );
        });
        // =========================================================
        // 👈 END: GLOBAL FILTER
        // =========================================================

        let enrichedTokens = await Promise.all(filteredTokens.map(enrichWithJupiterData));
        enrichedTokens.sort((a, b) => (new Date(b.createdAt) || 0) - (new Date(a.createdAt) || 0));
        res.status(200).json(enrichedTokens);
    } catch (err) {
        console.error("Error in /all-tokens:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/tokens', async (req, res) => {
    const { deployer } = req.query;
    if (!deployer) return res.status(400).send({ error: 'Deployer query parameter is required.' });
    try {
        const tokens = db.get('tokens').filter({ deployer }).value();
        let enrichedTokens = await Promise.all(tokens.map(enrichWithJupiterData));
        enrichedTokens.sort((a, b) => (new Date(b.createdAt) || 0) - (new Date(a.createdAt) || 0));
        res.send(enrichedTokens);
    } catch (err) {
        console.error("Error in /tokens:", err);
        res.status(500).send({ error: "Failed to fetch tokens." });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        ███████╗███████╗███╗   ██╗████████╗           ║
║        ╚══███╔╝██╔════╝████╗  ██║╚══██╔══╝           ║
║          ███╔╝ █████╗  ██╔██╗ ██║   ██║              ║
║         ███╔╝  ██╔══╝  ██║╚██╗██║   ██║              ║
║        ███████╗███████╗██║ ╚████║   ██║              ║
║        ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝              ║
║                                                       ║
║            ZENT Agentic Launchpad - $ZENT            ║
║                   0xzerebro.io                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

🚀 ZENT server running on http://localhost:${PORT}
    `);
    
    // Log countdown status on startup
    const now = Date.now();
    const remaining = FIXED_COUNTDOWN_END - now;
    
    console.log(`⏰ Fixed Countdown End: ${new Date(FIXED_COUNTDOWN_END).toISOString()}`);
    console.log(`   (December 15, 2025 at 11:00 AM UTC+2)`);
    
    if (remaining > 0) {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`⏳ Time remaining: ${hours}h ${minutes}m`);
    } else {
        console.log(`✅ Countdown has ended - Launch is LIVE!`);
    }
    
    console.log(`\n🔐 Authorized launcher: ${ALLOWED_LAUNCHER_WALLET || 'Anyone (no restriction)'}`);
    console.log(`👑 Admin wallet: ${ADMIN_WALLET || 'Not set'}`);
    console.log(`🌐 Website: https://0xzerebro.io`);
    console.log(`🐦 Twitter: https://x.com/ZENTSPY`);
});