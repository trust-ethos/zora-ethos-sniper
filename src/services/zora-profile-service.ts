import * as log from "@std/log";
import { getProfile } from "@zoralabs/coins-sdk";

export interface ZoraProfile {
  id?: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  website?: string;
  walletAddress?: string;
  twitterUsername?: string;
  instagramUsername?: string;
  tiktokUsername?: string;
  creatorCoinAddress?: string;
  creatorCoinMarketCap?: string;
}

export class ZoraProfileService {
  /**
   * Get profile information for a wallet address
   */
  async getProfileByAddress(address: string): Promise<ZoraProfile | null> {
    try {
      log.debug(`🔍 Fetching Zora profile for address: ${address}`);
      
      const response = await getProfile({
        identifier: address,
      });

      const profile = response?.data?.profile;
      
      if (!profile) {
        log.debug(`No Zora profile found for address: ${address}`);
        return null;
      }

      // Debug: Log the raw Twitter social account data to understand structure
      if (profile.socialAccounts?.twitter) {
        log.debug(`🔍 RAW Twitter data:`, JSON.stringify(profile.socialAccounts.twitter, null, 2));
      }

      const zoraProfile: ZoraProfile = {
        id: profile.id,
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio,
        website: profile.website,
        walletAddress: profile.publicWallet?.walletAddress,
        // FIX: Use username instead of displayName for Twitter handle
        twitterUsername: profile.socialAccounts?.twitter?.username || profile.socialAccounts?.twitter?.handle || profile.socialAccounts?.twitter?.displayName,
        instagramUsername: profile.socialAccounts?.instagram?.displayName,
        tiktokUsername: profile.socialAccounts?.tiktok?.displayName,
        creatorCoinAddress: profile.creatorCoin?.address,
        creatorCoinMarketCap: profile.creatorCoin?.marketCap,
      };

      log.debug(`✅ Found Zora profile: ${zoraProfile.handle || zoraProfile.displayName || address}`);
      if (zoraProfile.twitterUsername) {
        log.debug(`🐦 Twitter connected: @${zoraProfile.twitterUsername}`);
      }
      
      // Enhanced debug logging to understand Twitter field mapping
      if (profile.socialAccounts?.twitter) {
        const twitter = profile.socialAccounts.twitter;
        log.debug(`🔍 Twitter field analysis:`);
        log.debug(`   username: ${twitter.username || 'undefined'}`);
        log.debug(`   handle: ${twitter.handle || 'undefined'}`);  
        log.debug(`   displayName: ${twitter.displayName || 'undefined'}`);
        log.debug(`   screenName: ${twitter.screenName || 'undefined'}`);
        log.debug(`   id: ${twitter.id || 'undefined'}`);
        log.debug(`   → Using: ${zoraProfile.twitterUsername}`);
      }

      return zoraProfile;
    } catch (error) {
      log.error(`Failed to fetch Zora profile for ${address}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Check if a profile has a creator coin (indicates this is a creator coin launch)
   */
  isCreatorCoin(profile: ZoraProfile | null): boolean {
    return !!(profile?.creatorCoinAddress);
  }

  /**
   * Get the best identifier for a profile (prioritizes Twitter, then handle, then display name)
   */
  getBestIdentifier(profile: ZoraProfile): string {
    if (profile.twitterUsername) {
      return `@${profile.twitterUsername}`;
    }
    if (profile.handle) {
      return `@${profile.handle}`;
    }
    if (profile.displayName) {
      return profile.displayName;
    }
    return profile.walletAddress || "Unknown";
  }
} 