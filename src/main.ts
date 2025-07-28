import { load } from "@std/dotenv";
import * as log from "@std/log";
import { ZoraListener } from "./services/zora-listener.ts";
import { EthosService } from "./services/ethos-service.ts";
import { ZoraProfileService } from "./services/zora-profile-service.ts";
import { TradingBot } from "./services/trading-bot.ts";
import { Config } from "./config/config.ts";

async function main() {
  try {
    // Load environment variables
    await load({ export: true });
    
    // Setup logging
    log.setup({
      handlers: {
        console: new log.ConsoleHandler("DEBUG"),
        file: new log.FileHandler("DEBUG", {
          filename: "./logs/bot.log",
        }),
      },
      loggers: {
        default: {
          level: "DEBUG",
          handlers: ["console", "file"],
        },
      },
    });

    log.info("🚀 Starting Zora Ethos Sniper Bot...");

    // Load configuration
    const config = Config.load();
    
    // Update log level based on config
    const logLevel = config.logLevel.toUpperCase();
    log.setup({
      handlers: {
        console: new log.ConsoleHandler(logLevel as any),
        file: new log.FileHandler("DEBUG", {
          filename: "./logs/bot.log",
        }),
      },
      loggers: {
        default: {
          level: logLevel as any,
          handlers: ["console", "file"],
        },
      },
    });
    
    // Display mode prominently (use WARN so it shows even at WARN level)
    if (config.simulationMode) {
      log.warn("🎭 SIMULATION MODE ENABLED - No real trades will be executed");
      log.warn("💡 This is safe mode for testing and building confidence");
    } else {
      log.warn("⚠️  LIVE TRADING MODE - Real trades will be executed with real money!");
      log.warn("💰 Make sure you understand the risks before proceeding");
    }
    
    if (logLevel === "WARN") {
      log.warn("📊 QUIET MODE: Only showing trades and important events");
      log.warn(`📊 Configuration: Min Ethos Score: ${config.minEthosScore}, Max Investment: ${config.maxInvestmentEth} ETH`);
    } else {
      log.info(`📊 Configuration: Min Ethos Score: ${config.minEthosScore}, Max Investment: ${config.maxInvestmentEth} ETH`);
      log.info(`📋 Log Level: ${logLevel} (set LOG_LEVEL=WARN for quiet mode)`);
    }

    // Initialize services
    const ethosService = new EthosService();
    const zoraProfileService = new ZoraProfileService();
    const tradingBot = new TradingBot(config, ethosService);
    const zoraListener = new ZoraListener(config, ethosService, zoraProfileService, tradingBot);

    // Start listening for Zora coin creations
    await zoraListener.start();

    log.info("✅ Bot is now running and monitoring for new Zora coins...");

    // Keep the process running
    await new Promise(() => {}); // Run indefinitely

  } catch (error) {
    log.error(`❌ Failed to start bot: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
} 