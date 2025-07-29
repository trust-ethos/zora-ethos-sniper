export interface BotConfig {
  // Network Configuration
  baseRpcUrl: string;
  
  // Trading Strategy Configuration
  minEthosScore: number;
  maxInvestmentEth: number;
  takeProfitPercentage: number;
  stopLossPercentage: number;
  maxHoldTimeMinutes: number;
  
  // Trading Mode Configuration
  simulationMode: boolean;
  logLevel: string;
  
  // Wallet Configuration
  privateKey?: string;
  
  // Transaction Safety Limits
  maxGasPriceGwei: number;
  maxSlippagePercent: number;
  minLiquidityEth: number;
  transactionDeadlineMinutes: number;
  
  // Enhanced Trading Parameters
  tradeAmountEth: number;
  maxPositions: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  
  // Safety Switches
  enableBuying: boolean;
  enableSelling: boolean;
  dryRunMode: boolean;
  
  // Notification Configuration
  discordWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  
  // Zora Configuration
  zoraFactoryAddress: string;
}

export class Config {
  static load(): BotConfig {
    const config: BotConfig = {
      baseRpcUrl: Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org",
      minEthosScore: parseInt(Deno.env.get("MIN_ETHOS_SCORE") || "750"),
      maxInvestmentEth: parseFloat(Deno.env.get("MAX_INVESTMENT_ETH") || "0.1"),
      takeProfitPercentage: parseInt(Deno.env.get("TAKE_PROFIT_PERCENTAGE") || "200"),
      stopLossPercentage: parseInt(Deno.env.get("STOP_LOSS_PERCENTAGE") || "50"),
      maxHoldTimeMinutes: parseInt(Deno.env.get("MAX_HOLD_TIME_MINUTES") || "1440"),
      simulationMode: Deno.env.get("SIMULATION_MODE") !== "false", // Default to true for safety
      logLevel: Deno.env.get("LOG_LEVEL") || "INFO",
      privateKey: Deno.env.get("PRIVATE_KEY"),
      
      // Transaction Safety Limits
      maxGasPriceGwei: parseInt(Deno.env.get("MAX_GAS_PRICE_GWEI") || "20"),
      maxSlippagePercent: parseFloat(Deno.env.get("MAX_SLIPPAGE_PERCENT") || "5"),
      minLiquidityEth: parseFloat(Deno.env.get("MIN_LIQUIDITY_ETH") || "1.0"),
      transactionDeadlineMinutes: parseInt(Deno.env.get("TRANSACTION_DEADLINE_MINUTES") || "10"),
      
      // Enhanced Trading Parameters  
      tradeAmountEth: parseFloat(
        Deno.env.get("TRADE_AMOUNT_ETH") || 
        Deno.env.get("MAX_INVESTMENT_ETH") || // Backward compatibility
        "0.001"
      ),
      maxPositions: parseInt(Deno.env.get("MAX_POSITIONS") || "2"),
      takeProfitPercent: parseFloat(Deno.env.get("TAKE_PROFIT_PERCENT") || "150.0"),
      stopLossPercent: parseFloat(Deno.env.get("STOP_LOSS_PERCENT") || "50.0"),
      
      // Safety Switches
      enableBuying: Deno.env.get("ENABLE_BUYING") === "true",
      enableSelling: Deno.env.get("ENABLE_SELLING") === "true", 
      dryRunMode: Deno.env.get("DRY_RUN_MODE") !== "false", // Default to true for safety
      
      discordWebhookUrl: Deno.env.get("DISCORD_WEBHOOK_URL"),
      telegramBotToken: Deno.env.get("TELEGRAM_BOT_TOKEN"),
      telegramChatId: Deno.env.get("TELEGRAM_CHAT_ID"),
      zoraFactoryAddress: "0x777777751622c0d3258f214F9DF38E35BF45baF3", // Base mainnet
    };

    // Validate required configuration
    if (!config.baseRpcUrl) {
      throw new Error("BASE_RPC_URL is required");
    }

    if (config.minEthosScore < 0 || config.minEthosScore > 3000) {
      throw new Error("MIN_ETHOS_SCORE must be between 0 and 3000");
    }

    if (config.maxInvestmentEth <= 0) {
      throw new Error("MAX_INVESTMENT_ETH must be greater than 0");
    }

    if (config.takeProfitPercentage <= 0) {
      throw new Error("TAKE_PROFIT_PERCENTAGE must be greater than 0");
    }

    if (config.stopLossPercentage <= 0 || config.stopLossPercentage >= 100) {
      throw new Error("STOP_LOSS_PERCENTAGE must be between 0 and 100");
    }

    // Validate trading safety limits
    if (config.maxGasPriceGwei <= 0 || config.maxGasPriceGwei > 1000) {
      throw new Error("MAX_GAS_PRICE_GWEI must be between 1 and 1000");
    }

    if (config.maxSlippagePercent <= 0 || config.maxSlippagePercent > 50) {
      throw new Error("MAX_SLIPPAGE_PERCENT must be between 0 and 50");
    }

    if (config.tradeAmountEth <= 0 || config.tradeAmountEth > 10) {
      throw new Error("TRADE_AMOUNT_ETH must be between 0 and 10 ETH");
    }

    if (config.maxPositions <= 0 || config.maxPositions > 20) {
      throw new Error("MAX_POSITIONS must be between 1 and 20");
    }

    // Warn about dangerous settings
    if (!config.dryRunMode && !config.simulationMode) {
      console.warn("⚠️  WARNING: Both DRY_RUN_MODE and SIMULATION_MODE are disabled!");
      console.warn("⚠️  This will execute REAL transactions with REAL money!");
    }

    if (config.tradeAmountEth > 0.1) {
      console.warn(`⚠️  WARNING: Large trade amount configured: ${config.tradeAmountEth} ETH`);
    }

    return config;
  }

  static validate(config: BotConfig): void {
    // Additional runtime validation can be added here
    if (config.privateKey && config.privateKey.length !== 64) {
      throw new Error("PRIVATE_KEY must be 64 characters (without 0x prefix)");
    }

    // Validate that safety switches are properly configured for live trading
    if (!config.simulationMode && !config.dryRunMode) {
      if (!config.enableBuying && !config.enableSelling) {
        throw new Error("For live trading, at least one of ENABLE_BUYING or ENABLE_SELLING must be true");
      }
      
      if (!config.privateKey) {
        throw new Error("PRIVATE_KEY is required for live trading");
      }
    }
  }
} 