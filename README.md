# 🎯 Zora Ethos Sniper Bot

**Automated creator coin trading bot for Zora Protocol on Base network**

## ⚠️ **CRITICAL DISCLAIMERS & WARNINGS**

### 🚨 **FINANCIAL RISK WARNING**
- **USE AT YOUR OWN RISK** - This bot can lose money rapidly
- **NO LIABILITY** - Authors accept ZERO liability for any financial losses
- **EXPERIMENTAL SOFTWARE** - This is incomplete, unaudited code
- **NOT FINANCIAL ADVICE** - This tool is for educational purposes only
- **TOTAL LOSS POSSIBLE** - You may lose your entire trading balance

### 🛑 **MANDATORY REQUIREMENTS BEFORE LIVE TRADING**
1. **✅ MUST TEST IN SIMULATION MODE FIRST** - Run for days/weeks to understand behavior
2. **✅ MUST START WITH SMALL AMOUNTS** - Only risk what you can afford to lose completely  
3. **✅ MUST UNDERSTAND THE CODE** - Review all trading logic before use
4. **✅ MUST MONITOR CONSTANTLY** - This bot requires active supervision
5. **✅ MUST HAVE STOP-LOSS STRATEGY** - Set strict limits on maximum losses

### 📋 **KNOWN LIMITATIONS & RISKS**
- **⚠️ INCOMPLETE IMPLEMENTATION** - Trading logic is basic and experimental
- **⚠️ NO GUARANTEE OF PROFITS** - Most automated trading strategies lose money
- **⚠️ SMART CONTRACT RISKS** - Zora Protocol changes could break functionality
- **⚠️ NETWORK RISKS** - RPC failures, MEV, gas issues can cause losses
- **⚠️ SLIPPAGE RISKS** - Actual prices may differ significantly from expected
- **⚠️ REGULATORY RISKS** - Trading regulations vary by jurisdiction

---

## 🎯 **What This Bot Does**

This experimental bot monitors the **Zora Factory contract** on Base network for new creator coin launches, evaluates creators using **Ethos Network reputation scores**, and executes trades for qualifying creators.

### 🔍 **Core Strategy**
1. **Real-Time Monitoring** - Detects creator coins within seconds of launch
2. **Quality Filtering** - Only considers creators with established Zora profiles  
3. **Twitter Integration** - Requires connected Twitter accounts for reputation scoring
4. **Ethos Scoring** - Uses Twitter-based reputation scores (0-3000 range)
5. **Automated Trading** - Executes buy orders for qualifying creators (simulation mode available)

### 🛡️ **Triple-Layer Filtering System**
- **Profile Verification** - Must have valid Zora profile
- **Creator Coin Check** - Must be launching their official creator coin
- **Twitter Requirement** - Must have connected Twitter account
- **Ethos Threshold** - Must meet minimum reputation score
- **Freshness Filter** - Only processes events from AFTER bot startup

---

## 🚀 **Quick Start (SIMULATION MODE ONLY)**

### 1. **Prerequisites**
```bash
# Install Deno (https://deno.com/manual/getting_started/installation)
curl -fsSL https://deno.land/install.sh | sh

# Clone repository  
git clone <repository-url>
cd zora-ethos-sniper
```

### 2. **Configuration**
```bash
# Copy example environment file
cp config.example.env .env

# Edit configuration (REQUIRED)
nano .env
```

**Required Environment Variables:**
```env
# Base Network RPC (get from Alchemy, Infura, or QuickNode)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Trading Configuration
MIN_ETHOS_SCORE=750              # Minimum creator reputation (0-3000)
TRADE_AMOUNT_ETH=0.001           # Amount to trade per position
MAX_POSITIONS=5                  # Maximum concurrent positions
TAKE_PROFIT_PERCENT=150.0        # Take profit at +150%
STOP_LOSS_PERCENT=50.0           # Stop loss at -50%
MAX_HOLD_TIME_MINUTES=60         # Max hold time: 1 hour

# SIMULATION MODE (MANDATORY FOR TESTING)
SIMULATION_MODE=true             # NEVER set to false without extensive testing

# Logging
LOG_LEVEL=WARN                   # Options: DEBUG, INFO, WARN, ERROR

# Zora Factory Contract (Base)
ZORA_FACTORY_ADDRESS=0x777777751622c0d3258f214F9DF38E35BF45baF3
```

### 3. **Start in Simulation Mode**
```bash
# ALWAYS start with simulation first!
deno task start
```

**Expected Output:**
```
🔍 Bot initialized - will only process events created AFTER this moment
📅 Startup time: 2024-01-15T14:30:00.000Z
⚡ Zero tolerance for historical events - only real-time detection!
🎭 SIMULATION MODE ACTIVE - No real money will be spent

🪙 FRESH COIN: CreatorCoin (CREATE) - 12s old
   🐦 Checking Ethos for @creator123...
   📊 Ethos score: 1250 (HIGH)
   ✅ QUALIFIES! Score 1250 ≥ 750
💰 [SIMULATION] Created position for CreatorCoin
```

---

## 📊 **Understanding the Bot's Behavior**

### 🎯 **What Gets Filtered Out**
- **❌ No Zora Profile** - Creator has no established profile
- **❌ Not Creator Coin** - Not launching their official creator coin  
- **❌ No Twitter** - No connected Twitter account
- **❌ Low Ethos Score** - Below your minimum threshold
- **❌ Historical Events** - Events from before bot startup
- **❌ Old Events** - Events older than 2 minutes

### ✅ **What Gets Processed**
- **✅ Fresh Creator Coins** - Launched after bot startup
- **✅ Established Creators** - Have Zora profiles with Twitter
- **✅ High Reputation** - Meet your Ethos score threshold
- **✅ Real-Time Events** - Detected within seconds of creation

### 📈 **Ethos Score Guidelines**
- **2500-3000** - Ultra-high reputation (very rare)
- **1500-2500** - High reputation (selective)  
- **750-1500** - Medium reputation (balanced)
- **300-750** - Lower reputation (risky)
- **0-300** - Very low/no reputation (avoid)

---

## 🧪 **Testing & Validation**

### 🔍 **Pre-Trading Tests** (Run ALL of these)
```bash
# Test RPC connectivity and configuration
deno task test-ethos              # Verify Ethos API access
deno task status                  # Check all configurations

# Test event detection and filtering  
deno task test-events             # Test blockchain event detection
deno task test-enhanced           # Verify 100% event coverage
deno task test-strict             # Test historical event filtering

# Test creator evaluation pipeline
deno task test-creator-flow       # End-to-end creator evaluation
deno task test-twitter            # Twitter profile extraction
deno task test-twitter-only       # Twitter-only filtering strategy

# Test logging and monitoring
deno task test-log-levels         # Demo different verbosity levels
deno task test-validation         # Test score validation ranges
```

### 📊 **Simulation Mode Testing**
```bash
# Run simulation for extended periods
deno task start

# Monitor for at least 24-48 hours to understand:
# - Event frequency and types
# - Creator quality and scores  
# - Filtering effectiveness
# - Potential profitability patterns
```

---

## ⚙️ **Configuration Reference**

### 🎛️ **Trading Parameters**
```env
MIN_ETHOS_SCORE=750              # Higher = more selective (0-3000)
TRADE_AMOUNT_ETH=0.001           # Per-position size (start small!)
MAX_POSITIONS=5                  # Risk management (start with 1-2)
TAKE_PROFIT_PERCENT=150.0        # Exit at +150% profit
STOP_LOSS_PERCENT=50.0           # Exit at -50% loss
MAX_HOLD_TIME_MINUTES=60         # Force exit after 1 hour
```

### 📊 **Log Level Control**
```env
LOG_LEVEL=WARN   # Focused mode - shows activity + trades ⭐
LOG_LEVEL=INFO   # Normal mode - includes detailed profile info  
LOG_LEVEL=DEBUG  # Verbose mode - full debugging details
LOG_LEVEL=ERROR  # Quiet mode - errors only (too quiet for trading)
```

### 🎭 **Simulation vs Live Mode**
```env
SIMULATION_MODE=true    # Safe testing mode (recommended)
SIMULATION_MODE=false   # LIVE TRADING MODE (HIGH RISK!)
```

---

## 🔧 **Advanced Usage**

### 📱 **Monitoring & Alerts**
The bot outputs structured logs suitable for monitoring:
```bash
# Filter for trades only
deno task start 2>&1 | grep -E "(FRESH COIN|QUALIFIES|Created position|Closed position)"

# Monitor with timestamps
deno task start 2>&1 | while read line; do echo "$(date): $line"; done
```

### 🏃‍♂️ **Performance Optimization**
```bash
# Use optimized RPC endpoints
BASE_RPC_URL=wss://base-mainnet.g.alchemy.com/v2/YOUR_KEY  # WebSocket preferred

# Adjust polling frequency in code if needed
# Faster detection but higher RPC usage vs slower but more stable
```

### 🛠️ **Custom Strategy Development**
The bot is designed to be extensible:
- **Edit `src/services/trading-bot.ts`** - Modify trading logic
- **Edit `src/services/ethos-service.ts`** - Add custom scoring
- **Edit `src/config/config.ts`** - Add new parameters

---

## 🚨 **Emergency Procedures**

### 🛑 **Stop Trading Immediately**
```bash
# Kill the bot process
Ctrl+C  # or Command+C on Mac

# Or kill by process if needed
pkill -f "deno.*zora-ethos-sniper"
```

### 💰 **Emergency Position Management**
If you need to manually close positions:
1. **Check current positions** in your wallet
2. **Manually sell** on Zora frontend or DEX
3. **Document** any issues for future improvement

### 📋 **Troubleshooting**
```bash
# Check configuration
deno task status

# Test RPC connection  
deno task test-ethos

# Debug event detection
deno task test-events

# Verify filtering logic
deno task test-strict
```

---

## 📚 **Architecture & Technical Details**

### 🏗️ **System Components**
- **ZoraListener** - Monitors Base blockchain for creator coin events
- **ZoraProfileService** - Fetches creator profiles via Zora SDK
- **EthosService** - Evaluates creator reputation scores
- **TradingBot** - Executes trading decisions and position management
- **Config** - Manages environment variables and validation

### 🔗 **External Dependencies**
- **Zora Protocol** - Creator coin contracts on Base network
- **Ethos Network** - Reputation scoring API (no API key required)
- **Uniswap V4** - Latest AMM protocol with PoolManager architecture
- **Base Network** - Ethereum L2 blockchain
- **RPC Provider** - Alchemy, Infura, or QuickNode recommended

### 📡 **Event Detection Strategy**
- **Factory Contract Monitoring** - `0x777777751622c0d3258f214F9DF38E35BF45baF3`
- **Multi-Topic Detection** - Covers all known creator coin event signatures
- **Real-Time Polling** - 2-second intervals for fast detection
- **Duplicate Prevention** - Block-based tracking prevents reprocessing

---

## 🛡️ **Security Considerations**

### 🔐 **Private Key Safety**
- **NEVER commit private keys** to version control
- **Use hardware wallets** for significant amounts
- **Consider multi-sig** for large trading accounts
- **Rotate keys regularly** if compromised

### 🌐 **RPC Security**
- **Use authenticated RPC endpoints** when possible
- **Rate limit protection** to avoid API abuse
- **Monitor RPC costs** to prevent unexpected bills
- **Have backup RPC providers** for redundancy

### 🔍 **Code Auditing**
- **Review all trading logic** before live use
- **Test extensively** in simulation mode
- **Start with small amounts** for initial live testing
- **Monitor all transactions** for unexpected behavior

---

## 🤝 **Contributing & Development**

### 🔧 **Development Setup**
```bash
# Install dependencies (handled by Deno)
deno cache src/main.ts

# Run type checking
deno check src/main.ts

# Format code
deno fmt

# Run linting
deno lint
```

### 🧪 **Testing Framework**
```bash
# Run all tests
deno task test-all

# Add new tests in scripts/ directory
# Follow existing patterns for consistency
```

### 📝 **Code Structure**
```
src/
├── main.ts                 # Entry point
├── config/
│   └── config.ts          # Configuration management
├── services/
│   ├── zora-listener.ts   # Blockchain event monitoring
│   ├── zora-profile-service.ts  # Profile data fetching
│   ├── ethos-service.ts   # Reputation scoring
│   └── trading-bot.ts     # Trading logic
└── types/                 # TypeScript type definitions

scripts/                   # Testing and utility scripts
config.example.env         # Environment template
```

---

## 📄 **Legal & Compliance**

### ⚖️ **Regulatory Compliance**
- **Check local regulations** - Trading bots may be restricted in your jurisdiction
- **Tax implications** - Automated trading may have complex tax consequences  
- **KYC/AML requirements** - Ensure compliance with financial regulations
- **Professional advice** - Consult lawyers/accountants for significant usage

### 📜 **License & Usage Rights**
- **Open source** - Check repository license for usage terms
- **No warranty** - Software provided "as-is" without guarantees
- **Commercial use** - Review license terms for commercial applications
- **Attribution** - Credit original authors if modifying/redistributing

---

## 🆘 **Support & Resources**

### 📚 **Documentation**
- **Zora Protocol** - https://docs.zora.co/coins/
- **Ethos Network** - https://developers.ethos.network/
- **Base Network** - https://docs.base.org/
- **Deno Runtime** - https://deno.com/manual

### 🐛 **Issue Reporting**
When reporting issues, include:
- **Configuration** (without private keys!)
- **Log output** (last 50-100 lines)
- **Steps to reproduce** the problem
- **Expected vs actual behavior**

### 💬 **Community**
- **GitHub Issues** - Primary support channel
- **Discord/Telegram** - Community discussions (if available)
- **Twitter** - Updates and announcements

---

## 🎯 **Final Reminders**

### ✅ **Pre-Live Checklist**
- [ ] Tested in simulation mode for 24+ hours
- [ ] Reviewed and understood all trading logic
- [ ] Set appropriate risk limits (small amounts)
- [ ] Configured monitoring and alerts
- [ ] Have emergency stop procedures ready
- [ ] Understand tax and legal implications

### 🚨 **Risk Management**
- **Start small** - Use minimal amounts initially
- **Monitor constantly** - Don't run unattended for long periods
- **Set strict limits** - Maximum daily/weekly loss thresholds
- **Regular reviews** - Analyze performance and adjust strategy
- **Keep learning** - DeFi and trading landscapes change rapidly

### 🎭 **Remember: Simulation First!**
**NEVER** skip simulation mode. The cost of testing is near zero, but the cost of mistakes in live trading can be your entire balance.

---

## 📊 **Disclaimer Summary**

**This software is provided for educational and experimental purposes only. The authors accept no responsibility for any financial losses, technical issues, or other problems arising from its use. Cryptocurrency trading is extremely risky and most traders lose money. Only use this software with funds you can afford to lose completely. Always start with simulation mode and test extensively before any live trading.**

**USE AT YOUR OWN RISK. YOU HAVE BEEN WARNED.**

---

*Happy trading, and remember: the best trade is often the one you don't make! 🎯* 