import * as log from "@std/log";
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseEther, 
  formatEther, 
  getContract,
  encodePacked,
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import type { BotConfig } from "../config/config.ts";

// REAL Zora Router on Base (discovered from actual trade analysis)
const ZORA_ROUTER = "0x6ff5693b99212da76ad316178a184ab56d299b43" as Address;
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;

// Router ABI - same execute function as Universal Router
const ZORA_ROUTER_ABI = [
  {
    "inputs": [
      {"internalType": "bytes", "name": "commands", "type": "bytes"},
      {"internalType": "bytes[]", "name": "inputs", "type": "bytes[]"}
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes", "name": "commands", "type": "bytes"},
      {"internalType": "bytes[]", "name": "inputs", "type": "bytes[]"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"}
    ],
    "name": "execute", 
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// Router Commands (same as Universal Router)
const COMMANDS = {
  V3_SWAP_EXACT_IN: 0x00,  // Works for both V3 and V4
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
  SWEEP: 0x04,
} as const;

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
  private account?: any;
  private walletAddress?: string;

  constructor(private config: BotConfig) {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl),
    });

    if (config.privateKey) {
      try {
        // Fix private key formatting (remove 0x if present)
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
        log.info(`🎯 Using REAL Zora Router: ${ZORA_ROUTER}`);
      } catch (error) {
        log.error(`Failed to initialize wallet: ${error}`);
      }
    } else {
      log.warn("⚠️  No private key provided - DEX service in read-only mode");
    }
  }

  async buyToken(tokenAddress: Address, ethAmount: number, expectedMinTokens?: bigint): Promise<TradeResult> {
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
      log.warn(`   🎭 Using REAL Zora Router (4-command sequence)`);
      log.warn(`   ⚠️  REAL MONEY WILL BE SPENT!`);

      // Create router contract
      const router = getContract({
        address: ZORA_ROUTER,
        abi: ZORA_ROUTER_ABI,
        client: { public: this.publicClient, wallet: this.walletClient }
      });

      // ===== MULTI-COMMAND SEQUENCE (like successful transaction) =====
      
      // Commands: WRAP_ETH + V3_SWAP_EXACT_IN + V4_SWAP + SWEEP
      const commands = encodePacked(['uint8', 'uint8', 'uint8', 'uint8'], [
        COMMANDS.WRAP_ETH,        // 0x0b - Wrap ETH to WETH
        COMMANDS.V3_SWAP_EXACT_IN,// 0x00 - V3 swap  
        0x10,                     // 0x10 - V4_SWAP
        COMMANDS.SWEEP            // 0x04 - Sweep tokens
      ]);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + this.config.transactionDeadlineMinutes * 60);
      const amountIn = parseEther(ethAmount.toString());
      const amountOutMin = expectedMinTokens || 0n;
      
      // ===== INPUT 1: WRAP_ETH =====
      const wrapInput = encodeAbiParameters(
        parseAbiParameters('address, uint256'),
        [
          this.walletAddress as `0x${string}`,
          amountIn
        ]
      );
      
      // ===== INPUT 2: V3_SWAP_EXACT_IN =====
      const v3Path = encodePacked(['address', 'uint24', 'address'], [
        WETH_ADDRESS,
        3000, // 0.3% fee
        tokenAddress // This might need to be an intermediate token
      ]);

      const v3SwapInput = encodeAbiParameters(
        parseAbiParameters('address, uint256, uint256, bytes, bool'),
        [
          this.walletAddress as `0x${string}`,
          amountIn,
          amountOutMin,
          v3Path,
          false // not exactOutput
        ]
      );
      
      // ===== INPUT 3: V4_SWAP (Placeholder - needs actual V4 pool data) =====
      // This is complex and needs the actual pool parameters from the successful transaction
      const v4SwapInput = encodeAbiParameters(
        parseAbiParameters('address, uint256, uint256'),
        [
          this.walletAddress as `0x${string}`,
          amountIn,
          amountOutMin
        ]
      );
      
      // ===== INPUT 4: SWEEP =====
      const sweepInput = encodeAbiParameters(
        parseAbiParameters('address, address, uint256'),
        [
          tokenAddress, // Token to sweep
          this.walletAddress as `0x${string}`, // Recipient
          0n // Sweep all
        ]
      );

      // Execute the 4-command sequence
      const txHash = await (router as any).write.execute([
        commands,
        [wrapInput, v3SwapInput, v4SwapInput, sweepInput],
        deadline
      ], {
        value: amountIn // Send ETH
      });

      log.warn(`✅ Multi-command transaction submitted: ${txHash}`);
      log.warn(`🔗 BaseScan: https://basescan.org/tx/${txHash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ 
        hash: txHash 
      });

      if (receipt.status === 'success') {
        log.warn(`🎉 4-command creator coin trade successful!`);
        return {
          success: true,
          transactionHash: txHash,
          amountIn: ethAmount.toString(),
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: receipt.effectiveGasPrice.toString()
        };
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ Multi-command buy failed: ${errorMessage}`);
      return {
        success: false,
        amountIn: ethAmount.toString(),
        error: `Zora Router 4-command buy failed: ${errorMessage}`
      };
    }
  }

  async sellToken(tokenAddress: Address, tokenAmount: bigint, expectedMinEth?: bigint): Promise<TradeResult> {
    if (this.config.dryRunMode) {
      log.warn("🧪 DRY RUN: Would sell tokens but dry run mode is enabled");
      return {
        success: true,
        amountIn: tokenAmount.toString(),
        amountOut: "1000000000000000", // 0.001 ETH (simulated)
        transactionHash: "0xabcdef1234567890abcdef1234567890abcdef12"
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
      log.warn(`💰 LIVE TRADING: Selling ${tokenAmount} creator coins`);
      log.warn(`   🎯 Token: ${tokenAddress}`);
      log.warn(`   🎭 Using REAL Zora Router`);
      log.warn(`   ⚠️  REAL MONEY TRANSACTION!`);

      // Similar implementation for selling
      // TODO: Implement sell logic with proper token approval first
      
      throw new Error("Sell implementation pending - needs token approval flow");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ Sell failed: ${errorMessage}`);
      return {
        success: false,
        amountIn: tokenAmount.toString(),
        error: `Zora Router sell failed: ${errorMessage}`
      };
    }
  }
  
  isReadyForTrading(): boolean {
    return !!(this.walletClient && this.account);
  }

  getWalletAddress(): string | undefined {
    return this.walletAddress;
  }

  getTradingStatus(): string {
    if (!this.walletClient) return "❌ No wallet configured";
    if (this.config.dryRunMode) return "🧪 Dry run mode";
    if (!this.config.enableBuying && !this.config.enableSelling) return "🛡️  Trading disabled";
    return "✅ Ready for creator coin trading";
  }
} 