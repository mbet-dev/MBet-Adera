import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitInfo {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

class RateLimiter {
  private static instance: RateLimiter;
  private configs: Map<string, RateLimitConfig>;
  private storage: typeof AsyncStorage;

  private constructor() {
    this.configs = new Map();
    this.storage = AsyncStorage;
    this.initializeDefaultConfigs();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private initializeDefaultConfigs() {
    // Auth attempts rate limiting
    this.addConfig('auth', {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000 // 30 minutes
    });

    // API requests rate limiting
    this.addConfig('api', {
      maxAttempts: 100,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 5 * 60 * 1000 // 5 minutes
    });

    // OTP verification rate limiting
    this.addConfig('otp', {
      maxAttempts: 3,
      windowMs: 5 * 60 * 1000, // 5 minutes
      blockDurationMs: 15 * 60 * 1000 // 15 minutes
    });
  }

  public addConfig(key: string, config: RateLimitConfig) {
    this.configs.set(key, config);
  }

  private getStorageKey(key: string, identifier: string): string {
    return `rate_limit:${key}:${identifier}`;
  }

  private async getRateLimitInfo(key: string, identifier: string): Promise<RateLimitInfo> {
    const storageKey = this.getStorageKey(key, identifier);
    const stored = await this.storage.getItem(storageKey);
    
    if (!stored) {
      return {
        attempts: 0,
        lastAttempt: Date.now(),
        blockedUntil: null
      };
    }

    return JSON.parse(stored);
  }

  private async setRateLimitInfo(key: string, identifier: string, info: RateLimitInfo): Promise<void> {
    const storageKey = this.getStorageKey(key, identifier);
    await this.storage.setItem(storageKey, JSON.stringify(info));
  }

  public async checkRateLimit(key: string, identifier: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetTime: number;
    blockedUntil: number | null;
  }> {
    const config = this.configs.get(key);
    if (!config) {
      throw new Error(`No rate limit config found for key: ${key}`);
    }

    const now = Date.now();
    const info = await this.getRateLimitInfo(key, identifier);

    // Check if blocked
    if (info.blockedUntil && now < info.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: info.blockedUntil,
        blockedUntil: info.blockedUntil
      };
    }

    // Reset attempts if window has passed
    if (now - info.lastAttempt > config.windowMs) {
      info.attempts = 0;
    }

    // Check if max attempts reached
    if (info.attempts >= config.maxAttempts) {
      info.blockedUntil = now + config.blockDurationMs;
      await this.setRateLimitInfo(key, identifier, info);
      
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: info.blockedUntil,
        blockedUntil: info.blockedUntil
      };
    }

    // Update attempts
    info.attempts++;
    info.lastAttempt = now;
    await this.setRateLimitInfo(key, identifier, info);

    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - info.attempts,
      resetTime: now + config.windowMs,
      blockedUntil: null
    };
  }

  public async resetRateLimit(key: string, identifier: string): Promise<void> {
    const storageKey = this.getStorageKey(key, identifier);
    await this.storage.removeItem(storageKey);
  }

  public async getRemainingAttempts(key: string, identifier: string): Promise<number> {
    const config = this.configs.get(key);
    if (!config) {
      throw new Error(`No rate limit config found for key: ${key}`);
    }

    const info = await this.getRateLimitInfo(key, identifier);
    return Math.max(0, config.maxAttempts - info.attempts);
  }
}

export const rateLimiter = RateLimiter.getInstance();

// Helper function to get device identifier
export const getDeviceIdentifier = async (): Promise<string> => {
  // Use a combination of platform-specific identifiers
  const platform = Platform.OS;
  const version = Platform.Version;
  const deviceId = Constants.installationId || 'unknown';
  
  return `${platform}-${version}-${deviceId}`;
}; 