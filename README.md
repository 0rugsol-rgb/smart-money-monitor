# Smart Money AI - Monitor Service

24/7 WebSocket monitor service for tracking Solana transactions and feeding data to Supabase. Designed to run on Fly.io.

## Architecture

- **Monitor Service (Fly.io)**: Maintains persistent WebSocket connections to Chainstack
- **Database (Supabase)**: Stores processed transaction and wallet data  
- **Frontend (Vercel)**: Next.js app that reads from Supabase

## Features

- 🔄 **24/7 Monitoring**: Persistent WebSocket connections with auto-reconnect
- 🐋 **Whale Discovery**: Detects large transactions across all major DEXs
- 👀 **Smart Wallet Tracking**: Monitors verified smart money wallets
- 💾 **Data Storage**: Stores raw transactions and processed trade data
- 🔍 **Candidate Discovery**: Identifies potential new smart wallets
- 📊 **Health Monitoring**: Status logging and health checks

## Setup Instructions

### 1. Install Fly.io CLI

```bash
# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login
```

### 2. Configure Environment Variables

Get your Supabase service role key and Chainstack credentials, then set them as Fly.io secrets:

```bash
cd monitor

# Set Supabase credentials
flyctl secrets set SUPABASE_URL="https://rrhvgcgfbhiyvmfvmwng.supabase.co"
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Set Chainstack credentials  
flyctl secrets set CHAINSTACK_WSS_URL="wss://ws-solana-mainnet.chainstack.com/your-api-key"
flyctl secrets set CHAINSTACK_HTTP_URL="https://solana-mainnet.chainstack.com/your-api-key"
flyctl secrets set CHAINSTACK_API_KEY="your_chainstack_api_key"
```

### 3. Deploy to Fly.io

```bash
# Deploy the monitor service
flyctl deploy

# Check deployment status
flyctl status

# View logs
flyctl logs
```

## Monitoring

### Check Service Status
```bash
flyctl status
flyctl logs --follow
```

### Health Checks
The service includes built-in health monitoring:
- Connection status logging every minute
- Automatic reconnection on WebSocket failures
- Periodic wallet list refresh (every 5 minutes)

### Key Metrics
- **Connected**: WebSocket connection status
- **Tracked Wallets**: Number of wallets being monitored
- **Processed Transactions**: Count of processed transactions
- **Reconnect Attempts**: Connection reliability indicator

## Database Tables

The monitor service writes to these Supabase tables:

- `raw_transactions`: All detected transactions
- `trades`: Processed trade data from tracked wallets
- `candidate_wallets`: Newly discovered potential smart wallets
- `wallets`: Verified smart money wallets (read-only)

## DEX Coverage

Monitors all major Solana DEXs:
- **Raydium**: Established whale activity
- **Jupiter**: High-efficiency swaps  
- **Orca**: Yield farming whales
- **Pump.fun**: Meme token snipers
- **Meteora**: Advanced trading strategies
- **OpenBook**: Professional traders

## Cost Estimation

**Fly.io Costs** (shared-cpu-1x, 256MB RAM):
- ~$5-6/month for 24/7 operation
- Automatic scaling and health monitoring included

**Total Monthly Cost**: ~$5-6 (Supabase free tier + Fly.io)

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check Chainstack API key and URL
   - Verify WebSocket endpoint is accessible

2. **Database Errors**  
   - Confirm Supabase service role key is correct
   - Check table permissions and RLS policies

3. **High Memory Usage**
   - Monitor processed transaction cache size
   - Adjust cleanup intervals if needed

### Debug Commands
```bash
# View real-time logs
flyctl logs --follow

# Check app status
flyctl status

# Restart the service
flyctl apps restart smart-money-monitor

# Scale resources if needed
flyctl scale memory 512
```

## Security

- Uses Supabase **Service Role Key** (full database access)
- Runs in isolated Fly.io container
- Environment variables stored as encrypted secrets
- Non-root user execution in Docker container
