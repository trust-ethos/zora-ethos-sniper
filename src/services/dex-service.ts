import * as log from "@std/log";
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseEther, 
  formatEther,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { tradeCoin, type TradeParameters } from "@zoralabs/coins-sdk";
import type { BotConfig } from "../config/config.ts";

export interface TradeResult {
  success: boolean;
  transactionHash?: string;
  amountIn: string;
  amountOut?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
}

export class DexService {
  private walletClient?: WalletClient;
  private publicClient: PublicClient;
  private account: any; // Explicitly 'any' due to viem typing issues
  private walletAddress?: string;

  constructor(private config: BotConfig) {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    if (config.privateKey) {
      try {
        const cleanKey = config.privateKey.startsWith('0x') 
          ? config.privateKey.slice(2) 
          : config.privateKey;
          
        this.account = privateKeyToAccount(`0x${cleanKey}` as `0x${string}`);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: base,
          transport: http(config.baseRpcUrl),
        });
        this.walletAddress = this.account.address;
        log.info(`🔑 DEX Service initialized for wallet: ${this.walletAddress}`);
        log.info(`🎯 Using Official Zora SDK`);
      } catch (error) {
        log.error(`Failed to initialize wallet: ${error}`);
      }
    } else {
      log.info("⚠️  No private key provided - DEX service in read-only mode");
    }
  }

  async buyToken(tokenAddress: Address, ethAmount: number, _expectedMinTokens?: bigint): Promise<TradeResult> {
    if (this.config.dryRunMode) {
      log.warn("🧪 DRY RUN: Would buy tokens but dry run mode is enabled");
      return {
        success: true,
        amountIn: ethAmount.toString(),
        amountOut: "1000000000000000000", // 1 token (simulated)
        transactionHash: "0x1234567890abcdef1234567890abcdef12345678"
      };
    }

    if (!this.config.enableBuying) {
      return {
        success: false,
        amountIn: ethAmount.toString(),
        error: "🛡️  Buying is disabled by ENABLE_BUYING=false"
      };
    }

    if (!this.walletClient || !this.account) {
      return {
        success: false,
        amountIn: ethAmount.toString(),
        error: "🔑 No wallet configured for trading"
      };
    }

    try {
      log.warn(`💰 LIVE TRADING: Buying ${ethAmount} ETH worth of creator coins`);
      log.warn(`   🎯 Token: ${tokenAddress}`);
      log.warn(`   🎭 Using Official Zora SDK`);
      log.warn(`   ⚠️  REAL MONEY WILL BE SPENT!`);

      // Create trade parameters using official Zora SDK
      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: {
          type: "erc20",
          address: tokenAddress,
        },
        amountIn: parseEther(ethAmount.toString()),
        slippage: this.config.maxSlippagePercent / 100, // Convert percentage to decimal
        sender: this.account.address,
      };

      log.info(`   📊 Trade Parameters:`);
      log.info(`      From: ETH`);
      log.info(`      To: ${tokenAddress}`);
      log.info(`      Amount: ${ethAmount} ETH`);
      log.info(`      Slippage: ${this.config.maxSlippagePercent}%`);
      log.info(`      Sender: ${this.account.address}`);

      // Step 1: Validate token exists on blockchain
      log.info(`   🔄 Step 1: Validating token exists on Base...`);
      try {
        const code = await this.publicClient.getBytecode({ address: tokenAddress });
        if (!code || code === '0x') {
          log.error(`   ❌ Token contract does not exist on Base: ${tokenAddress}`);
          throw new Error(`Token contract does not exist: ${tokenAddress}`);
        }
        log.info(`   ✅ Token contract exists on Base`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`   ❌ Token validation failed: ${errorMsg}`);
        throw new Error(`Token validation failed: ${errorMsg}`);
      }

      // Step 2: Test quote with retry logic
      log.info(`   🔄 Step 2: Testing quote for ${tokenAddress}...`);
      let lastQuoteError: Error | null = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { createTradeCall } = await import("@zoralabs/coins-sdk");
          const testQuote = await createTradeCall(tradeParameters);
          log.info(`   ✅ Quote successful: ${formatEther(BigInt(testQuote.call.value))} ETH (attempt ${attempt})`);
          break; // Success, exit retry loop
        } catch (quoteError) {
          lastQuoteError = quoteError instanceof Error ? quoteError : new Error(String(quoteError));
          log.warn(`   ⚠️ Quote attempt ${attempt} failed: ${lastQuoteError.message}`);
          
          if (attempt < 3) {
            const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
            log.info(`   ⏳ Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      if (lastQuoteError) {
        log.error(`   ❌ All quote attempts failed: ${lastQuoteError.message}`);
        throw new Error(`Quote failed after 3 attempts: ${lastQuoteError.message}`);
      }

      // Step 3: Execute the actual trade
      log.info(`   🔄 Step 3: Executing trade...`);
      const receipt = await tradeCoin({
        tradeParameters,
        walletClient: this.walletClient,
        account: this.account,
        publicClient: this.publicClient,
        validateTransaction: true, // Keep validation enabled for safety
      });

      log.warn(`✅ Zora SDK trade successful!`);
      log.warn(`🔗 Transaction Hash: ${receipt.transactionHash}`);
      log.warn(`🔗 BaseScan: https://basescan.org/tx/${receipt.transactionHash}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amountIn: ethAmount.toString(),
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced error logging
      log.error(`❌ Zora SDK buy failed for token ${tokenAddress}:`);
      log.error(`   Error: ${errorMessage}`);
      
      if (error instanceof Error) {
        log.error(`   Error type: ${error.constructor.name}`);
        if (error.cause) {
          log.error(`   Cause: ${error.cause}`);
        }
        if (error.stack) {
          log.error(`   Stack trace (first 3 lines):`);
          error.stack.split('\n').slice(0, 3).forEach(line => {
            log.error(`     ${line}`);
          });
        }
      }
      
      // Check if it's a specific type of error
      if (errorMessage.includes('quote') || errorMessage.includes('Quote')) {
        log.error(`   💡 This appears to be a quote/pricing error`);
        log.error(`   🔍 Possible causes:`);
        log.error(`      • Token has insufficient liquidity`);
        log.error(`      • Token is not tradeable on Zora`);
        log.error(`      • Network connectivity issues`);
        log.error(`      • API rate limiting`);
      }

      return {
        success: false,
        amountIn: ethAmount.toString(),
        error: `Zora SDK buy failed: ${errorMessage}`
      };
    }
  }

  async sellToken(tokenAddress: Address, tokenAmount: bigint, _expectedMinEth?: bigint): Promise<TradeResult> {
    if (this.config.dryRunMode) {
      log.warn("🧪 DRY RUN: Would sell tokens but dry run mode is enabled");
      return {
        success: true,
        amountIn: tokenAmount.toString(),
        amountOut: "1000000000000000000", // 1 ETH (simulated)
        transactionHash: "0x1234567890abcdef1234567890abcdef12345678"
      };
    }

    if (!this.config.enableSelling) {
      return {
        success: false,
        amountIn: tokenAmount.toString(),
        error: "🛡️  Selling is disabled by ENABLE_SELLING=false"
      };
    }

    if (!this.walletClient || !this.account) {
      return {
        success: false,
        amountIn: tokenAmount.toString(),
        error: "🔑 No wallet configured for trading"
      };
    }

    try {
      log.warn(`💰 LIVE TRADING: Selling ${tokenAmount} creator coins for ETH`);
      log.warn(`   🎯 Token: ${tokenAddress}`);
      log.warn(`   🎭 Using Official Zora SDK`);
      log.warn(`   ⚠️  REAL MONEY TRANSACTION!`);

      // Create trade parameters for selling creator coin → ETH
      const tradeParameters: TradeParameters = {
        sell: {
          type: "erc20",
          address: tokenAddress,
        },
        buy: { type: "eth" },
        amountIn: tokenAmount,
        slippage: this.config.maxSlippagePercent / 100, // Convert percentage to decimal
        sender: this.account.address,
      };

      log.info(`   📊 Trade Parameters:`);
      log.info(`      From: ${tokenAddress}`);
      log.info(`      To: ETH`);
      log.info(`      Amount: ${tokenAmount} tokens`);
      log.info(`      Slippage: ${this.config.maxSlippagePercent}%`);

      // Execute trade using official Zora SDK (with permit handling)
      const receipt = await tradeCoin({
        tradeParameters,
        walletClient: this.walletClient,
        account: this.account,
        publicClient: this.publicClient,
        validateTransaction: true, // Keep validation enabled for safety
      });

      log.warn(`✅ Zora SDK sell successful!`);
      log.warn(`🔗 Transaction Hash: ${receipt.transactionHash}`);
      log.warn(`🔗 BaseScan: https://basescan.org/tx/${receipt.transactionHash}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        amountIn: tokenAmount.toString(),
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ Zora SDK sell failed: ${errorMessage}`);
      return {
        success: false,
        amountIn: tokenAmount.toString(),
        error: `Zora SDK sell failed: ${errorMessage}`
      };
    }
  }

  getTradingStatus(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.walletClient || !this.account) {
      issues.push("Wallet not configured (PRIVATE_KEY missing or invalid).");
    }
    
    if (!this.config.enableBuying && !this.config.enableSelling) {
      issues.push("Both ENABLE_BUYING and ENABLE_SELLING are false.");
    }
    
    if (this.config.dryRunMode) {
      issues.push("DRY_RUN_MODE is enabled (no real trades will occur).");
    }
    
    return { 
      ready: issues.length === 0, 
      issues 
    };
  }
}