// Smart Money AI - 24/7 WebSocket Monitor Service
// Runs on Fly.io to continuously monitor Solana transactions
require('dotenv').config();
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

// ====================
// CONFIGURATION
// ====================

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  chainstackWssUrl: process.env.CHAINSTACK_WSS_URL,
  chainstackHttpUrl: process.env.CHAINSTACK_HTTP_URL,
  chainstackApiKey: process.env.CHAINSTACK_API_KEY,
};

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CHAINSTACK_WSS_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Supabase Admin Client (SERVICE ROLE KEY!)
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// DEX Program IDs (from your existing constants)
const DEX_PROGRAM_IDS = {
  RAYDIUM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  JUPITER: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  METEORA: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  OPENBOOK: 'srmqPiDkJXRLGgxtFBRNJhGjLhQKLLqPKCCQGLFTQqo',
};

const ACTIVE_DEX_PROGRAMS = Object.values(DEX_PROGRAM_IDS);

// ====================
// WEBSOCKET MONITOR CLASS
// ====================

class SolanaMonitor {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.subscriptionIds = new Set(); // Store multiple subscription IDs
    this.trackedWallets = new Set();
    this.processedTransactions = new Set(); // Prevent duplicate processing
    
    // Load tracked wallets on startup
    this.loadTrackedWallets();
  }

  // ====================
  // WALLET MANAGEMENT
  // ====================

  async loadTrackedWallets() {
    try {
      console.log('📋 Loading tracked wallets from Supabase...');
      
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('wallet_address')
        .eq('is_verified', true);

      if (error) {
        console.error('❌ Error loading wallets:', error);
        return;
      }

      this.trackedWallets = new Set(wallets.map(w => w.wallet_address));
      console.log(`✅ Loaded ${this.trackedWallets.size} tracked wallets`);
      
    } catch (error) {
      console.error('❌ Failed to load tracked wallets:', error);
    }
  }

  // ====================
  // CONNECTION MANAGEMENT
  // ====================

  async connect() {
    if (this.isConnected || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('⚠️ Already connected or connecting');
      return;
    }

    try {
      console.log('🔗 Connecting to Chainstack WebSocket...');
      
      this.ws = new WebSocket(config.chainstackWssUrl);
      
      this.ws.onopen = () => {
        console.log('✅ Connected to Chainstack WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.subscribeToLogs();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`);
        this.isConnected = false;
        this.subscriptionIds.clear();
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('❌ Failed to connect to Chainstack:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Exiting...');
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff with max 60 seconds
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 60000);
  }

  // ====================
  // SUBSCRIPTION MANAGEMENT
  // ====================

  subscribeToLogs() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected, cannot subscribe');
      return;
    }

    console.log('📡 Subscribing to DEX programs (one at a time due to Chainstack limits)...');
    
    // Subscribe to each DEX program individually (Chainstack limitation: only 1 address per subscription)
    ACTIVE_DEX_PROGRAMS.forEach((programId, index) => {
      const subscribeMessage = {
        jsonrpc: '2.0',
        id: index + 1, // Use different IDs for each subscription
        method: 'logsSubscribe',
        params: [
          {
            mentions: [programId],
          },
          {
            commitment: 'finalized',
          },
        ],
      };

      console.log(`📡 Subscribing to ${Object.keys(DEX_PROGRAM_IDS).find(key => DEX_PROGRAM_IDS[key] === programId)} (${programId})`);
      this.ws.send(JSON.stringify(subscribeMessage));
    });

    // Also subscribe to tracked wallets if any exist
    if (this.trackedWallets.size > 0) {
      Array.from(this.trackedWallets).forEach((walletAddress, index) => {
        const subscribeMessage = {
          jsonrpc: '2.0',
          id: ACTIVE_DEX_PROGRAMS.length + index + 1,
          method: 'logsSubscribe',
          params: [
            {
              mentions: [walletAddress],
            },
            {
              commitment: 'finalized',
            },
          ],
        };

        console.log(`📡 Subscribing to tracked wallet ${walletAddress.substring(0, 8)}...`);
        this.ws.send(JSON.stringify(subscribeMessage));
      });
    }

    console.log(`✅ Sent ${ACTIVE_DEX_PROGRAMS.length + this.trackedWallets.size} subscription requests`);
  }

  // ====================
  // MESSAGE HANDLING
  // ====================

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      // Only log important messages (not transaction data to reduce noise)
      if (message.method !== 'logsNotification') {
        console.log('📥 WebSocket message received:', JSON.stringify(message));
      }

      // Handle subscription confirmation (multiple IDs now)
      if (message.id && message.result) {
        this.subscriptionIds.add(message.result);
        console.log(`✅ Subscribed to logs. Subscription ID ${message.id}: ${message.result}`);
        return;
      }
      
      // Handle subscription errors
      if (message.id && message.error) {
        console.error(`❌ Subscription ${message.id} failed:`, message.error);
        return;
      }

      // Handle log notifications
      if (message.method === 'logsNotification' && message.params) {
        this.handleLogNotification(message.params.result);
      }

    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  async handleLogNotification(logEntry) {
    try {
      // First, let's see what the actual structure is
      if (!logEntry?.value?.signature) {
        console.log('⚠️ Unexpected log entry structure:', JSON.stringify(logEntry, null, 2));
        return;
      }

      const { signature, logs } = logEntry.value;
      
      // Prevent duplicate processing
      if (this.processedTransactions.has(signature)) {
        return;
      }
      this.processedTransactions.add(signature);

      // Clean up old processed transactions (keep last 1000)
      if (this.processedTransactions.size > 1000) {
        const entries = Array.from(this.processedTransactions);
        this.processedTransactions = new Set(entries.slice(-500));
      }

      console.log('🔔 New transaction:', {
        signature: signature.substring(0, 16) + '...',
        slot: logEntry.context?.slot,
        logsCount: logs?.length || 0,
      });

      // Check if this is a DEX transaction
      if (this.isDEXTransaction(logs)) {
        console.log('💱 DEX transaction detected:', signature);
        await this.processTransaction(signature, logEntry.value, logEntry.context);
      }

    } catch (error) {
      console.error('❌ Error handling log notification:', error);
    }
  }

  // ====================
  // TRANSACTION PROCESSING
  // ====================

  isDEXTransaction(logs) {
    return logs.some(log => 
      ACTIVE_DEX_PROGRAMS.some(programId => log.includes(programId)) ||
      log.includes('swap') ||
      log.includes('trade') ||
      log.includes('exchange')
    );
  }

  async processTransaction(signature, valueData, contextData) {
    try {
      console.log('📝 Processing transaction:', signature.substring(0, 16) + '...');
      
      // Skip raw transaction storage for now and focus on wallet discovery
      // await this.storeRawTransaction(signature, valueData, contextData);
      
      // Direct wallet discovery from logs (bypass full transaction fetch)
      await this.quickWalletDiscovery(signature, valueData, contextData);

    } catch (error) {
      console.error('❌ Error processing transaction:', error);
    }
  }

  async storeRawTransaction(signature, valueData, contextData) {
    try {
      const { error } = await supabase
        .from('raw_transactions')
        .upsert({
          tx_signature: signature,
          slot: contextData?.slot,
          block_time: valueData?.blockTime,
          accounts: valueData?.accounts || [],
          logs: valueData?.logs || [],
          processed: false,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'tx_signature'
        });

      if (error) {
        console.error('❌ Error storing raw transaction:', error);
      } else {
        console.log('💾 Stored raw transaction:', signature.substring(0, 16) + '...');
      }

    } catch (error) {
      console.error('❌ Error in storeRawTransaction:', error);
    }
  }

  async analyzeAndStoreTransaction(transaction) {
    try {
      const { meta, transaction: tx } = transaction;
      
      if (meta.err) {
        console.log('⚠️ Transaction failed, skipping analysis');
        return;
      }

      // Find tracked wallets in transaction
      const involvedWallets = tx.message.accountKeys.filter(account => 
        this.trackedWallets.has(account)
      );

      if (involvedWallets.length > 0) {
        console.log('👀 Tracked wallet activity:', {
          signature: transaction.signature.substring(0, 16) + '...',
          wallets: involvedWallets.length
        });

        // Store detailed trade data
        await this.storeTradeData(transaction, involvedWallets);
      }

      // Check for new wallet discovery
      await this.checkForWalletDiscovery(transaction);

    } catch (error) {
      console.error('❌ Error analyzing transaction:', error);
    }
  }

  async quickWalletDiscovery(signature, valueData, contextData) {
    try {
      // Extract wallet addresses from logs
      const logs = valueData.logs || [];
      const walletAddresses = this.extractWalletAddresses(logs);
      
      if (walletAddresses.length > 0) {
        console.log('🔍 Found wallets in transaction:', {
          signature: signature.substring(0, 16) + '...',
          wallets: walletAddresses.length
        });

        // Analyze each wallet for profitability
        for (const walletAddress of walletAddresses) {
          await this.analyzeWalletProfitability(walletAddress, signature, contextData);
        }
      }

    } catch (error) {
      console.error('❌ Error in quick wallet discovery:', error);
    }
  }

  extractWalletAddresses(logs) {
    const walletAddresses = new Set();
    
    // Look for wallet addresses in logs (base58 format, 32-44 chars)
    const walletRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    
    logs.forEach(log => {
      const matches = log.match(walletRegex);
      if (matches) {
        matches.forEach(address => {
          // Basic validation for Solana addresses
          if (address.length >= 32 && address.length <= 44) {
            walletAddresses.add(address);
          }
        });
      }
    });

    return Array.from(walletAddresses);
  }

  async analyzeWalletProfitability(walletAddress, signature, contextData) {
    try {
      // Simple heuristic: if wallet appears in multiple DEX transactions, it's potentially profitable
      console.log('💰 Analyzing wallet profitability:', walletAddress.substring(0, 8) + '...');
      
      // Create a candidate wallet entry
      const { error } = await supabase
        .from('candidate_wallets')
        .upsert({
          wallet_address: walletAddress,
          discovery_timestamp: new Date().toISOString(),
          discovery_source: 'DEX_activity',
          discovery_type: 'jupiter_swap',
          initial_score: 50,
          confidence: 0.5,
          status: 'pending',
          discovery_metadata: {
            signature: signature,
            slot: contextData?.slot
          }
        }, {
          onConflict: 'wallet_address'
        });

      if (error) {
        console.error('❌ Error storing candidate wallet:', error);
      } else {
        console.log('🐋 Added candidate wallet:', walletAddress.substring(0, 8) + '...');
      }

    } catch (error) {
      console.error('❌ Error analyzing wallet profitability:', error);
    }
  }

  async storeTradeData(transaction, wallets) {
    try {
      for (const walletAddress of wallets) {
        const tradeData = {
          wallet_address: walletAddress,
          transaction_signature: transaction.signature,
          block_number: transaction.slot,
          timestamp: new Date(transaction.blockTime * 1000).toISOString(),
          dex_program_id: this.detectDEXProgram(transaction.transaction.message.accountKeys),
          status: 'detected',
          raw_data: transaction,
        };

        const { error } = await supabase
          .from('trades')
          .upsert(tradeData, {
            onConflict: 'transaction_signature,wallet_address'
          });

        if (error) {
          console.error('❌ Error storing trade data:', error);
        } else {
          console.log('💰 Stored trade data for wallet:', walletAddress.substring(0, 8) + '...');
        }
      }
    } catch (error) {
      console.error('❌ Error in storeTradeData:', error);
    }
  }

  async checkForWalletDiscovery(transaction) {
    try {
      // Look for large transactions that might indicate smart money activity
      const accountKeys = transaction.transaction.message.accountKeys || [];
      const dexProgram = this.detectDEXProgram(accountKeys);
      
      if (!dexProgram) return;

      // The first account is usually the signer (potential smart wallet)
      const potentialWallet = accountKeys[0];
      
      if (!potentialWallet || this.trackedWallets.has(potentialWallet)) {
        return; // Already tracking this wallet
      }

      // Store as candidate wallet for discovery system
      const { error } = await supabase
        .from('candidate_wallets')
        .upsert({
          wallet_address: potentialWallet,
          discovery_method: 'chainstack_monitor',
          confidence_score: 0.5,
          first_seen_tx: transaction.signature,
          first_seen_at: new Date(transaction.blockTime * 1000).toISOString(),
          dex_program: dexProgram,
          metadata: {
            slot: transaction.slot,
            accountCount: accountKeys.length,
            monitor_source: 'fly_io'
          }
        }, {
          onConflict: 'wallet_address'
        });

      if (!error) {
        console.log('🔍 New candidate wallet discovered:', potentialWallet.substring(0, 8) + '...');
      }

    } catch (error) {
      console.error('❌ Error in wallet discovery:', error);
    }
  }

  detectDEXProgram(accountKeys) {
    for (const [dexName, programId] of Object.entries(DEX_PROGRAM_IDS)) {
      if (accountKeys.includes(programId)) {
        return programId;
      }
    }
    return null;
  }

  // ====================
  // HTTP RPC CALLS
  // ====================

  async getTransaction(signature) {
    try {
      if (!config.chainstackHttpUrl) {
        console.log('⚠️ No HTTP URL configured, skipping transaction fetch');
        return null;
      }

      const response = await fetch(config.chainstackHttpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            signature,
            {
              encoding: 'json',
              commitment: 'finalized',
              maxSupportedTransactionVersion: 0,
            },
          ],
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('❌ RPC Error:', data.error);
        return null;
      }

      return data.result;

    } catch (error) {
      console.error('❌ Error fetching transaction:', error);
      return null;
    }
  }

  // ====================
  // HEALTH CHECK & STATUS
  // ====================

  getStatus() {
    return {
      connected: this.isConnected,
      trackedWallets: this.trackedWallets.size,
      subscriptionIds: Array.from(this.subscriptionIds),
      reconnectAttempts: this.reconnectAttempts,
      processedTransactions: this.processedTransactions.size,
    };
  }

  // Periodic wallet refresh
  async refreshTrackedWallets() {
    console.log('🔄 Refreshing tracked wallets...');
    await this.loadTrackedWallets();
    
    // Resubscribe with updated wallet list
    if (this.isConnected) {
      this.subscribeToLogs();
    }
  }
}

// ====================
// HTTP HEALTH CHECK SERVER
// ====================

const http = require('http');

function startHealthServer(monitor) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const status = monitor.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        monitor: status
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(8080, '0.0.0.0', () => {
    console.log('🏥 Health check server listening on 0.0.0.0:8080');
  });

  return server;
}

// ====================
// MAIN APPLICATION
// ====================

async function main() {
  console.log('🚀 Starting Smart Money AI Monitor Service');
  console.log('📊 Configuration:', {
    supabaseUrl: config.supabaseUrl ? '✅ Set' : '❌ Missing',
    supabaseKey: config.supabaseServiceKey ? '✅ Set' : '❌ Missing',
    chainstackWss: config.chainstackWssUrl ? '✅ Set' : '❌ Missing',
    chainstackHttp: config.chainstackHttpUrl ? '✅ Set' : '⚠️ Optional',
  });

  const monitor = new SolanaMonitor();
  
  // Start health check server
  const healthServer = startHealthServer(monitor);
  
  // Start monitoring
  await monitor.connect();

  // Refresh tracked wallets every 5 minutes
  setInterval(() => {
    monitor.refreshTrackedWallets();
  }, 5 * 60 * 1000);

  // Log status every minute
  setInterval(() => {
    const status = monitor.getStatus();
    console.log('📊 Monitor Status:', status);
  }, 60 * 1000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down monitor service...');
    if (monitor.ws) {
      monitor.ws.close();
    }
    if (healthServer) {
      healthServer.close();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    if (monitor.ws) {
      monitor.ws.close();
    }
    if (healthServer) {
      healthServer.close();
    }
    process.exit(0);
  });

  console.log('✅ Monitor service started successfully');
  console.log('🔍 Monitoring Solana transactions 24/7...');
}

// Start the application
main().catch(error => {
  console.error('❌ Fatal error starting monitor:', error);
  process.exit(1);
});
