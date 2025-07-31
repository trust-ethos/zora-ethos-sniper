import * as log from "@std/log";
import { createPublicClient, http, parseAbiItem, type Address, type Log } from "viem";
import { base } from "viem/chains";
import type { BotConfig } from "../config/config.ts";
import type { EthosService } from "./ethos-service.ts";
import type { ZoraProfileService } from "./zora-profile-service.ts";
import type { TradingBot } from "./trading-bot.ts";

// Zora Factory events from the documentation
const COIN_CREATED_V3_EVENT = parseAbiItem(
  "event CoinCreated(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, address pool, string version)"
);

const COIN_CREATED_V4_EVENT = parseAbiItem(
  "event CoinCreatedV4(address indexed caller, address indexed payoutRecipient, address indexed platformReferrer, address currency, string uri, string name, string symbol, address coin, bytes32 poolKey, bytes32 poolKeyHash, string version)"
);

export interface ZoraCoinCreatedEvent {
  caller: Address;
  payoutRecipient: Address;
  platformReferrer: Address;
  currency: Address;
  uri: string;
  name: string;
  symbol: string;
  coin: Address;
  pool?: Address; // V3 only
  poolKey?: string; // V4 only
  poolKeyHash?: string; // V4 only
  version: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
}

export class ZoraListener {
  private publicClient;
  private isRunning = false;
  private lastProcessedBlock = 0n;
  private startupTimestamp = 0; // Timestamp when bot started
  private startupBlock = 0n; // Block when bot started

  constructor(
    private config: BotConfig,
    private ethosService: EthosService,
    private zoraProfileService: ZoraProfileService,
    private tradingBot: TradingBot
  ) {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn("Zora listener is already running");
      return;
    }

    this.isRunning = true;
    log.info("Starting Zora Factory event listener...");

    try {
      // Capture startup timestamp and block to ensure we only process truly fresh events
      this.startupTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp
      const currentBlock = await this.publicClient.getBlockNumber();
      this.startupBlock = currentBlock;
      this.lastProcessedBlock = currentBlock;
      
      log.info(`Starting to monitor from block ${currentBlock}`);
      log.info("🔍 Bot initialized - will only process events created AFTER this moment");
      log.info(`📅 Startup time: ${new Date().toISOString()}`);
      log.info(`🔢 Startup block: ${currentBlock}`);
      log.info("⚡ Zero tolerance for historical events - only real-time detection!");

      // Start watching for new events
      await this.watchForNewCoins();
    } catch (error) {
      log.error(`Failed to start Zora listener: ${error instanceof Error ? error.message : String(error)}`);
      this.isRunning = false;
      throw error;
    }
  }

  stop(): void {
    this.isRunning = false;
    log.info("Stopping Zora listener...");
  }

  private async watchForNewCoins(): Promise<void> {
    log.info(`🔍 Watching for new Zora coins on factory: ${this.config.zoraFactoryAddress}`);
    log.info(`📡 Using polling-based event detection (more reliable than filters)`);

    // Use polling instead of event filters for better reliability with public RPCs
    await this.startPollingForEvents();
  }

  private async startPollingForEvents(): Promise<void> {
    const pollInterval = 10000; // Poll every 10 seconds for faster detection
    
    log.info(`⏰ Starting event polling every ${pollInterval / 1000} seconds`);
    
    while (this.isRunning) {
      try {
        await this.checkForNewEvents();
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        log.error(`Event polling error: ${error instanceof Error ? error.message : String(error)}`);
        // Wait a bit before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async startPeriodicEventCheck(): Promise<void> {
    const checkInterval = 30000; // Check every 30 seconds
    
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }

      try {
        await this.checkForNewEvents();
      } catch (error) {
        log.error(`Periodic event check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, checkInterval);
  }

  private async checkForNewEvents(): Promise<void> {
    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      
      if (currentBlock <= this.lastProcessedBlock) {
        return;
      }

      const fromBlock = this.lastProcessedBlock + 1n;
      const toBlock = currentBlock;

      // Limit range to avoid RPC issues (most RPCs limit to 500 blocks)
      const maxBlockRange = 500n;
      const actualToBlock = fromBlock + maxBlockRange > toBlock ? toBlock : fromBlock + maxBlockRange - 1n;

      log.debug(`Checking for events from block ${fromBlock} to ${actualToBlock} (latest: ${currentBlock})`);

      // Get ALL events from the factory (generic approach - more robust)
      const allLogs = await this.publicClient.getLogs({
        address: this.config.zoraFactoryAddress as Address,
        fromBlock,
        toBlock: actualToBlock,
      });

      if (allLogs.length > 0) {
        log.info(`📥 Found ${allLogs.length} new event(s) in blocks ${fromBlock}-${actualToBlock}`);
        
        // Filter for known creator coin creation events only
        const knownCreatorCoinTopics = [
          "0x2de436107c2096e039c98bbcc3c5a2560583738ce15c234557eecb4d3221aa81", // Original topic we found
          "0x74b670d628e152daa36ca95dda7cb0002d6ea7a37b55afe4593db7abd1515781", // Topic from user's example coin
        ];
        
        const creatorCoinEvents = allLogs.filter(log => 
          knownCreatorCoinTopics.includes(log.topics[0] || "")
        );
        
        log.info(`🎭 Found ${creatorCoinEvents.length} potential creator coin event(s)`);
        
        // Process creator coin events
        for (const logEntry of creatorCoinEvents) {
          await this.handleGenericCoinEvent(logEntry);
        }
      }

      this.lastProcessedBlock = actualToBlock;
    } catch (error) {
      log.error(`Failed to check for new events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGenericCoinEvent(eventLog: Log): Promise<void> {
    try {
      const event = this.parseGenericEvent(eventLog);
      if (!event) return;

      // STRICT filtering: Only process events from AFTER bot startup
      const currentBlock = await this.publicClient.getBlockNumber();
      const blockAge = Number(currentBlock - event.blockNumber);
      
      // Filter 1: Block must be newer than startup block
      if (event.blockNumber <= this.startupBlock) {
        log.debug(`🚫 FILTERED: Event from startup block or earlier (block ${event.blockNumber} ≤ ${this.startupBlock})`);
        return;
      }
      
      // Filter 2: Event must be very recent (max 10 blocks = ~2 minutes old)
      if (blockAge > 10) {
        log.info(`🚫 FILTERED: Event too old - ${blockAge} blocks ago (${event.name})`);
        return;
      }
      
      // Filter 3: Additional timestamp check for events
      const blockInfo = await this.publicClient.getBlock({ blockNumber: event.blockNumber });
      const eventTimestamp = Number(blockInfo.timestamp);
      
      if (eventTimestamp <= this.startupTimestamp) {
        log.debug(`🚫 FILTERED: Event timestamp before startup (${new Date(eventTimestamp * 1000).toISOString()})`);
        return;
      }

      // Show truly fresh coin detection
      const eventAge = Math.floor((Date.now() / 1000) - eventTimestamp);
      log.info(`🪙 FRESH COIN: ${event.name} (${event.symbol}) - ${eventAge}s old`);
      log.info(`   Creator: ${event.caller}`);
      log.info(`   Block: ${event.blockNumber}, TX: ${event.transactionHash}`);

      // Get creator's Zora profile to determine if this is a creator coin
      const creatorProfile = await this.zoraProfileService.getProfileByAddress(event.caller);
      
      if (!creatorProfile) {
        log.info(`   ❌ No Zora profile - SKIPPED (not a creator coin)`);
        return;
      }

      // Check if this is actually a creator coin launch
      if (!this.zoraProfileService.isCreatorCoin(creatorProfile)) {
        log.info(`   ❌ No creator coin - SKIPPED (not a creator launch)`);
        log.debug(`   Profile details: Handle=${creatorProfile.handle}, CreatorCoin=${creatorProfile.creatorCoinAddress}`);
        return;
      }

      // Extra validation for debugging
      if (!creatorProfile.creatorCoinAddress) {
        log.error(`🚨 FILTERING BUG: Profile passed isCreatorCoin() but has no creatorCoinAddress!`);
        log.error(`   Profile: ${JSON.stringify(creatorProfile)}`);
        return;
      }

      const creatorIdentifier = this.zoraProfileService.getBestIdentifier(creatorProfile);
      log.info(`   👤 Creator Profile: ${creatorIdentifier}`);
      
      if (creatorProfile.bio) {
        log.info(`   📝 Bio: ${creatorProfile.bio.slice(0, 100)}${creatorProfile.bio.length > 100 ? '...' : ''}`);
      }

      // Only process creators with Twitter accounts
      if (!creatorProfile.twitterUsername) {
        log.info(`   ❌ No Twitter - SKIPPED (Twitter required)`);
        return;
      }

      log.info(`   🐦 Checking Ethos for @${creatorProfile.twitterUsername}...`);
      
      // Get Ethos score using Twitter username
      const ethosScore = await this.ethosService.getScoreByTwitterUsername(creatorProfile.twitterUsername);
      
      if (ethosScore === null) {
        log.info(`   ❌ No Ethos score - SKIPPED (@${creatorProfile.twitterUsername})`);
        return;
      }

      log.info(`   📊 Ethos score: ${ethosScore} (${this.ethosService.getRiskAssessment(ethosScore)})`);
      log.info(`   🎯 Risk assessment: ${this.ethosService.getRiskAssessment(ethosScore)}`);

      // Check if the score meets our threshold
      if (this.ethosService.meetsScoreThreshold(ethosScore, this.config.minEthosScore)) {
        log.warn(`   ✅ QUALIFIES! Score ${ethosScore} ≥ ${this.config.minEthosScore}`);
        
        // Notify the trading bot with enhanced data and error handling
        try {
          await this.tradingBot.evaluateAndTrade(event, ethosScore, event.caller, creatorProfile);
        } catch (tradeError) {
          const tradeErrorMsg = tradeError instanceof Error ? tradeError.message : String(tradeError);
          log.error(`❌ Trading failed for ${event.name} (${event.coin}): ${tradeErrorMsg}`);
          
          // Log specific error types for debugging
          if (tradeErrorMsg.includes('does not exist')) {
            log.error(`🔍 TOKEN NOT FOUND: ${event.coin} - Contract does not exist on Base`);
          } else if (tradeErrorMsg.includes('Quote failed')) {
            log.error(`🔍 QUOTE FAILURE: ${event.coin} - Zora API issues`);
          } else if (tradeErrorMsg.includes('500')) {
            log.error(`🔍 SERVER ERROR: ${event.coin} - Zora API server error`);
          }
          
          // Continue monitoring other events
          log.info(`🔄 Continuing to monitor for other opportunities...`);
        }
      } else {
        log.info(`   ❌ Score too low - SKIPPED (${ethosScore} < ${this.config.minEthosScore})`);
      }

    } catch (error) {
      log.error(`Failed to handle creator coin event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleCoinCreatedEvent(eventLog: Log): Promise<void> {
    // Legacy method - now redirects to generic handler
    await this.handleGenericCoinEvent(eventLog);
  }



  private parseGenericEvent(eventLog: Log): ZoraCoinCreatedEvent | null {
    try {
      // Parse the raw event data manually since we don't have the exact ABI
      // Based on the actual event structure we observed:
      // topics[0] = event signature hash
      // topics[1] = caller (indexed)
      // topics[2] = payoutRecipient (indexed)
      // topics[3] = platformReferrer (indexed)
      // data = packed non-indexed parameters
      
      if (eventLog.topics.length < 4) {
        log.error(`Event log has insufficient topics: ${eventLog.topics.length}`);
        return null;
      }

      // Extract indexed parameters from topics
      const caller = `0x${eventLog.topics[1]!.slice(-40)}` as Address;
      const payoutRecipient = `0x${eventLog.topics[2]!.slice(-40)}` as Address;
      const platformReferrer = `0x${eventLog.topics[3]!.slice(-40)}` as Address;

      // Decode the data field to extract strings and other parameters
      const decodedData = this.decodeEventData(eventLog.data);
      
      if (!decodedData) {
        log.error(`Failed to decode event data for TX: ${eventLog.transactionHash}`);
        return null;
      }

      return {
        caller,
        payoutRecipient,
        platformReferrer,
        currency: decodedData.currency || "0x0000000000000000000000000000000000000000" as Address,
        uri: decodedData.uri || "",
        name: decodedData.name || "Unknown",
        symbol: decodedData.symbol || "UNKNOWN",
        coin: decodedData.coin || "0x0000000000000000000000000000000000000000" as Address,
        version: decodedData.version || "unknown",
        blockNumber: eventLog.blockNumber!,
        transactionHash: eventLog.transactionHash!,
        logIndex: eventLog.logIndex!,
      };
    } catch (error) {
      log.error(`Failed to parse generic event: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private decodeEventData(data: string): { 
    currency?: Address; 
    uri?: string; 
    name?: string; 
    symbol?: string; 
    coin?: Address; 
    version?: string; 
  } | null {
    try {
      // Simple decoder for the structured data we observed
      // The event data contains addresses and strings in a specific format
      
      // Look for IPFS URI pattern
      const ipfsMatch = data.match(/697066733a2f2f([0-9a-f]+)/);
      let uri = "";
      if (ipfsMatch) {
        const ipfsHex = ipfsMatch[1];
        const bytes = new Uint8Array(ipfsHex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
        uri = "ipfs://" + new TextDecoder().decode(bytes);
      }

      // Look for text patterns that could be name/symbol
      // This is a basic implementation - in practice we'd need proper ABI decoding
      let name = "Unknown";
      let symbol = "UNKNOWN";

      // Try to extract readable strings from the data
      const hexData = data.slice(2); // Remove 0x prefix
      const chunks = hexData.match(/.{64}/g) || [];
      
      for (const chunk of chunks) {
        try {
          const bytes = new Uint8Array(chunk.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
          const decoded = new TextDecoder().decode(bytes).replace(/\0/g, '');
          if (decoded.length > 0 && decoded.length < 50 && /^[a-zA-Z0-9\s\u{1F000}-\u{1F6FF}]+$/u.test(decoded)) {
            if (decoded.length > 5 && !symbol.includes(decoded.toUpperCase())) {
              name = decoded;
            } else if (decoded.length <= 10 && decoded.toUpperCase() === decoded) {
              symbol = decoded;
            }
          }
        } catch {
          // Skip invalid chunks
        }
      }

      // Extract coin address from the correct position in event data
      // Based on investigation: coin address is at the start of the data field
      let coin: Address | undefined;
      let currency: Address | undefined;

      if (data && data.length >= 66) {
        // Extract the coin address from bytes 12-32 of the data (skip padding zeros)
        const coinAddressHex = data.slice(26, 66); // 40 hex chars = 20 bytes
        coin = `0x${coinAddressHex}` as Address;
        
        log.debug(`🔍 Event data extraction:`);
        log.debug(`   Raw data: ${data.slice(0, 100)}...`);
        log.debug(`   Extracted coin: ${coin}`);
        
        // Extract currency/pool address if it exists (next 32 bytes)
        if (data.length >= 130) {
          const currencyAddressHex = data.slice(90, 130); // Next 40 hex chars
          // Only use if it's not all zeros
          if (currencyAddressHex !== '0'.repeat(40)) {
            currency = `0x${currencyAddressHex}` as Address;
            log.debug(`   Extracted currency: ${currency}`);
          }
        }
      }

      return {
        currency,
        uri,
        name,
        symbol,
        coin,
        version: "unknown"
      };
    } catch (error) {
      log.error(`Failed to decode event data: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private parseEvent(eventLog: Log): ZoraCoinCreatedEvent | null {
    // Legacy method - redirect to generic parser
    return this.parseGenericEvent(eventLog);
  }



  // Public method to get current status
  getStatus(): { isRunning: boolean; lastProcessedBlock: bigint } {
    return {
      isRunning: this.isRunning,
      lastProcessedBlock: this.lastProcessedBlock,
    };
  }
} 