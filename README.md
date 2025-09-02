# 🐋 Smart Money AI - Solana Monitor Service

**24/7 WebSocket monitor service for tracking Solana transactions and discovering profitable wallets**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🎯 Project Overview

Smart Money AI is a comprehensive Solana blockchain analytics platform that tracks and analyzes whale movements, smart money wallets, and profitable trading patterns in real-time. This monitor service is the core engine that maintains persistent WebSocket connections to Solana and feeds data to our analytics platform.

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitor       │    │   Database      │    │   Frontend      │
│   Service       │───▶│   Supabase      │◀───│   Next.js       │
│   (Render.com)  │    │   PostgreSQL    │    │   (Vercel)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chainstack    │    │   Raw Data      │    │   User          │
│   WebSocket     │    │   Processing    │    │   Dashboard     │
│   Solana RPC    │    │   Analytics     │    │   Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Key Features

### 🔄 **24/7 Real-Time Monitoring**
- Persistent WebSocket connections to Solana mainnet
- Automatic reconnection with exponential backoff
- Health monitoring and status reporting
- Zero-downtime operation

### 🐋 **Whale & Smart Money Discovery**
- **Large Transaction Detection**: Identifies transactions >$10K
- **Smart Wallet Tracking**: Monitors verified profitable wallets
- **Candidate Discovery**: Finds new potential smart money wallets
- **Pattern Recognition**: Analyzes trading patterns and strategies

### 🏪 **Comprehensive DEX Coverage**
- **Jupiter**: High-efficiency swaps and aggregator
- **Raydium V4**: Established whale activity and liquidity
- **Pump.fun**: Meme token snipers and early adopters
- **Orca/Whirlpool**: Yield farming and concentrated liquidity
- **Moonshot**: New token launches and presales
- **CPAMM**: Constant product automated market makers

### 💾 **Advanced Data Processing**
- **Raw Transaction Storage**: Complete transaction history
- **Trade Analysis**: Profit/loss calculations and win rates
- **Wallet Profiling**: Performance metrics and scoring
- **Real-time Updates**: Live data streaming to frontend

## 🎯 Use Cases

### 📊 **For Traders**
- **Follow the Smart Money**: Track successful wallets and copy their trades
- **Early Detection**: Get alerts on large transactions before they impact price
- **Pattern Analysis**: Understand successful trading strategies
- **Risk Management**: Identify high-risk vs. low-risk opportunities

### 🔍 **For Researchers**
- **Market Analysis**: Study whale behavior and market dynamics
- **Token Research**: Analyze which tokens smart money is buying/selling
- **Strategy Development**: Learn from successful trading patterns
- **Data Science**: Access to comprehensive Solana transaction data

### 💼 **For Institutions**
- **Market Intelligence**: Monitor institutional movements
- **Compliance**: Track large transactions for regulatory purposes
- **Risk Assessment**: Analyze market liquidity and volatility
- **Investment Research**: Identify emerging opportunities

## 🛠️ Technology Stack

### **Backend Services**
- **Node.js**: Runtime environment for the monitor service
- **WebSocket**: Real-time connection to Solana blockchain
- **Chainstack**: Reliable Solana RPC and WebSocket provider
- **Supabase**: PostgreSQL database with real-time subscriptions

### **Frontend Platform**
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Shadcn/UI**: Modern component library

### **Deployment & Infrastructure**
- **Render.com**: Cloud hosting for the monitor service
- **Vercel**: Frontend deployment and edge functions
- **Docker**: Containerized deployment
- **GitHub**: Version control and CI/CD

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ **Supabase Project**: Database and authentication
- ✅ **Chainstack Account**: Solana RPC and WebSocket access
- ✅ **GitHub Account**: For repository hosting
- ✅ **Render.com Account**: For service deployment

## 🚀 Quick Start

### 1. **Clone the Repository**
```bash
git clone https://github.com/0rugsol-rgb/smart-money-monitor.git
cd smart-money-monitor
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Configure Environment Variables**
Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sbp_your_secret_service_role_key

# Chainstack Configuration
CHAINSTACK_WSS_URL=wss://ws-solana-mainnet.chainstack.com/your-api-key
CHAINSTACK_HTTP_URL=https://solana-mainnet.chainstack.com/your-api-key
CHAINSTACK_API_KEY=your_chainstack_api_key

# Optional
NODE_ENV=production
```

### 4. **Deploy to Render.com**

#### **Option A: One-Click Deploy**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

#### **Option B: Manual Deploy**
1. Go to [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `0rugsol-rgb/smart-money-monitor`
4. Configure the service:
   - **Name**: `smart-money-monitor`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --production`
   - **Start Command**: `node index.js`
   - **Plan**: `Starter` (Free tier)
5. Set environment variables (see above)
6. Click "Create Web Service"

## 📊 Database Schema

The monitor service writes to these Supabase tables:

### **`raw_transactions`**
```sql
CREATE TABLE raw_transactions (
  id SERIAL PRIMARY KEY,
  signature VARCHAR(88) UNIQUE NOT NULL,
  slot BIGINT NOT NULL,
  block_time TIMESTAMP,
  wallet_address VARCHAR(44),
  token_mint VARCHAR(44),
  amount DECIMAL(20,8),
  usd_value DECIMAL(20,2),
  dex_program VARCHAR(44),
  transaction_type VARCHAR(50),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **`candidate_wallets`**
```sql
CREATE TABLE candidate_wallets (
  wallet_address VARCHAR(44) PRIMARY KEY,
  discovery_timestamp TIMESTAMP DEFAULT NOW(),
  discovery_source VARCHAR(50),
  discovery_type VARCHAR(50),
  initial_score DECIMAL(5,2),
  confidence DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending',
  discovery_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **`trades`**
```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL,
  signature VARCHAR(88) UNIQUE NOT NULL,
  token_mint VARCHAR(44),
  amount DECIMAL(20,8),
  usd_value DECIMAL(20,2),
  trade_type VARCHAR(20),
  dex_program VARCHAR(44),
  profit_loss DECIMAL(20,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ | `sbp_abc123...` |
| `CHAINSTACK_WSS_URL` | Chainstack WebSocket URL | ✅ | `wss://ws-solana-mainnet.chainstack.com/...` |
| `CHAINSTACK_HTTP_URL` | Chainstack HTTP RPC URL | ✅ | `https://solana-mainnet.chainstack.com/...` |
| `CHAINSTACK_API_KEY` | Chainstack API key | ✅ | `your_api_key_here` |
| `NODE_ENV` | Environment mode | ❌ | `production` |

### **DEX Program IDs**
The service monitors these Solana program IDs:
- **Jupiter**: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`
- **Raydium V4**: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
- **Pump.fun**: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
- **Orca/Whirlpool**: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
- **Moonshot**: `MoonCVxNpTsqZjcTaL4TfQhF2h9j4Y1QZ8Yr54v97gY`
- **CPAMM**: `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`

## 📈 Monitoring & Health Checks

### **Health Endpoint**
The service provides a health check endpoint at `/health`:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "connections": {
    "websocket": "connected",
    "database": "connected"
  },
  "metrics": {
    "processedTransactions": 1250,
    "trackedWallets": 45,
    "candidateWallets": 12
  }
}
```

### **Logging**
The service logs important events:
- ✅ WebSocket connection status
- ✅ Transaction processing counts
- ✅ Wallet discovery events
- ✅ Database write operations
- ❌ Connection failures and retries
- ❌ Error conditions and stack traces

### **Key Metrics**
- **Processed Transactions**: Total transactions analyzed
- **Tracked Wallets**: Number of wallets being monitored
- **Candidate Wallets**: New wallets discovered
- **Connection Uptime**: WebSocket connection reliability
- **Database Writes**: Data persistence success rate

## 💰 Cost Estimation

### **Render.com Costs**
- **Starter Plan**: Free tier available
- **Professional Plan**: $7/month for production use
- **Features**: Auto-scaling, health monitoring, custom domains

### **Chainstack Costs**
- **Developer Plan**: $49/month for 1M requests
- **Professional Plan**: $199/month for 5M requests
- **Enterprise**: Custom pricing for high-volume usage

### **Supabase Costs**
- **Free Tier**: 500MB database, 50MB file storage
- **Pro Plan**: $25/month for 8GB database, 100GB file storage
- **Team Plan**: $599/month for 100GB database, 1TB file storage

**Total Monthly Cost**: $0-25 (using free tiers) to $200+ (production scale)

## 🔒 Security

### **Data Protection**
- ✅ Environment variables stored as encrypted secrets
- ✅ Service role key with minimal required permissions
- ✅ Non-root user execution in Docker container
- ✅ HTTPS-only communication
- ✅ Input validation and sanitization

### **Access Control**
- ✅ Supabase Row Level Security (RLS) policies
- ✅ API rate limiting and authentication
- ✅ Secure WebSocket connections
- ✅ Regular security updates and monitoring

## 🐛 Troubleshooting

### **Common Issues**

#### **1. WebSocket Connection Failures**
```bash
# Check Chainstack credentials
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://solana-mainnet.chainstack.com/your-api-key
```

#### **2. Database Connection Errors**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     https://your-project.supabase.co/rest/v1/
```

#### **3. High Memory Usage**
- Monitor processed transaction cache size
- Adjust cleanup intervals in configuration
- Scale up Render.com plan if needed

### **Debug Commands**
```bash
# View real-time logs
render logs --service smart-money-monitor

# Check service status
render status --service smart-money-monitor

# Restart the service
render restart --service smart-money-monitor
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
# Fork the repository
git clone https://github.com/your-username/smart-money-monitor.git
cd smart-money-monitor

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Code Standards**
- Follow TypeScript best practices
- Write comprehensive tests
- Document all public APIs
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/0rugsol-rgb/smart-money-monitor/wiki)
- **Issues**: [GitHub Issues](https://github.com/0rugsol-rgb/smart-money-monitor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/0rugsol-rgb/smart-money-monitor/discussions)
- **Email**: support@0rug.com

## 🙏 Acknowledgments

- **Solana Foundation** for the amazing blockchain
- **Chainstack** for reliable RPC infrastructure
- **Supabase** for the developer-friendly database
- **Render.com** for seamless deployment
- **Open Source Community** for inspiration and tools

---

**Built with ❤️ by the Smart Money AI Team**

*Follow the smart money. Make smart decisions.*