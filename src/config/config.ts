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

    return config;
  }

  static validate(config: BotConfig): void {
    // Additional runtime validation can be added here
    if (config.privateKey && !config.privateKey.startsWith("0x")) {
      throw new Error("PRIVATE_KEY must start with 0x");
    }
  }
} 