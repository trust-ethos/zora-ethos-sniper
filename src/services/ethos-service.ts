import * as log from "@std/log";

export interface EthosProfile {
  primaryAddress: string;
  score: number;
  positiveReviews: number;
  negativeReviews: number;
  twitterHandle?: string;
  twitterVerified: boolean;
}

export interface EthosSearchResult {
  profiles: EthosProfile[];
  hasMore: boolean;
}

export class EthosService {
  private readonly baseUrl = "https://api.ethos.network";
  private readonly clientName = "zora-ethos-sniper@1.0.0";

  async getProfileByAddress(address: string): Promise<EthosProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/profile/${address}`, {
        headers: {
          "X-Ethos-Client": this.clientName,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.debug(`No Ethos profile found for address: ${address}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`API Error: ${data.error || "Unknown error"}`);
      }

      return this.mapProfileData(data.data);
    } catch (error) {
      log.error(`Failed to fetch Ethos profile for ${address}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async searchProfilesByTwitter(twitterHandle: string): Promise<EthosProfile[]> {
    try {
      // Remove @ symbol if present
      const cleanHandle = twitterHandle.replace(/^@/, "");
      
      const response = await fetch(`${this.baseUrl}/api/v1/profiles/search?twitter=${encodeURIComponent(cleanHandle)}`, {
        headers: {
          "X-Ethos-Client": this.clientName,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`API Error: ${data.error || "Unknown error"}`);
      }

      return data.data.profiles.map((profile: any) => this.mapProfileData(profile));
    } catch (error) {
      log.error(`Failed to search Ethos profiles for Twitter @${twitterHandle}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getScoreByAddress(address: string): Promise<number | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/score/${address}`, {
        headers: {
          "X-Ethos-Client": this.clientName,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.debug(`No Ethos score found for address: ${address}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`API Error: ${data.error || "Unknown error"}`);
      }

      return data.data.score;
    } catch (error) {
      log.error(`Failed to fetch Ethos score for ${address}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get Ethos score by Twitter username using userkey format
   */
  async getScoreByTwitterUsername(twitterUsername: string): Promise<number | null> {
    try {
      // Remove @ if present
      const cleanUsername = twitterUsername.replace(/^@/, '');
      
      // Use userkey format: service:x.com:username:<username>
      const userkey = `service:x.com:username:${cleanUsername}`;
      
      const response = await fetch(`${this.baseUrl}/api/v2/score/userkey?userkey=${encodeURIComponent(userkey)}`, {
        headers: {
          "X-Ethos-Client": this.clientName,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.debug(`No Ethos score found for Twitter @${twitterUsername}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.score || null;
    } catch (error) {
      log.error(`Failed to fetch Ethos score for Twitter @${twitterUsername}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async getHighestScoreForAddresses(addresses: string[]): Promise<{ address: string; score: number } | null> {
    if (addresses.length === 0) return null;

    let highestScore = -1;
    let bestAddress = null;

    // Check scores for all addresses in parallel
    const scorePromises = addresses.map(async (address) => {
      const score = await this.getScoreByAddress(address);
      return { address, score: score || 0 };
    });

    const results = await Promise.all(scorePromises);
    
    for (const result of results) {
      if (result.score > highestScore) {
        highestScore = result.score;
        bestAddress = result.address;
      }
    }

    return bestAddress ? { address: bestAddress, score: highestScore } : null;
  }

  private mapProfileData(data: any): EthosProfile {
    return {
      primaryAddress: data.primaryAddress || data.address,
      score: data.score || 0,
      positiveReviews: data.positiveReviews || 0,
      negativeReviews: data.negativeReviews || 0,
      twitterHandle: data.twitterHandle,
      twitterVerified: data.twitterVerified || false,
    };
  }

  // Helper method to determine if a score meets the threshold
  meetsScoreThreshold(score: number, threshold: number): boolean {
    return score >= threshold;
  }

  // Helper method to get a risk assessment based on score
  getRiskAssessment(score: number): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
    if (score >= 850) return "LOW";
    if (score >= 750) return "MEDIUM";
    if (score >= 600) return "HIGH";
    return "VERY_HIGH";
  }
} 