import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { router } from 'expo-router';
import { errorHandler } from './errorHandler';

interface SessionConfig {
  refreshThresholdMs: number;
}

interface SessionState {
  lastActivity: number;
  isRefreshing: boolean;
}

class SessionManager {
  private static instance: SessionManager;
  private config: SessionConfig;
  private state: SessionState;
  private activityCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      refreshThresholdMs: 24 * 60 * 60 * 1000 // 24 hours refresh threshold
    };

    this.state = {
      lastActivity: Date.now(),
      isRefreshing: false
    };
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public setConfig(config: Partial<SessionConfig>) {
    this.config = { ...this.config, ...config };
  }

  public async initialize() {
    await this.loadState();
    this.startActivityMonitoring();
    this.setupActivityListeners();
  }

  private async loadState() {
    try {
      const stored = await AsyncStorage.getItem('session_state');
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (error) {
      errorHandler.handleError(error, 'SessionManager');
    }
  }

  private async saveState() {
    try {
      await AsyncStorage.setItem('session_state', JSON.stringify(this.state));
    } catch (error) {
      errorHandler.handleError(error, 'SessionManager');
    }
  }

  private startActivityMonitoring() {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    // Only check for session refresh, not expiration
    this.activityCheckInterval = setInterval(() => {
      this.checkSessionRefresh();
    }, 60 * 60 * 1000); // Check every hour instead of every minute
  }

  private setupActivityListeners() {
    if (Platform.OS === 'web') {
      // Web-specific activity listeners
      window.addEventListener('mousemove', this.updateActivity.bind(this));
      window.addEventListener('keydown', this.updateActivity.bind(this));
      window.addEventListener('click', this.updateActivity.bind(this));
      window.addEventListener('scroll', this.updateActivity.bind(this));
    }
  }

  private async updateActivity() {
    const now = Date.now();
    this.state.lastActivity = now;
    await this.saveState();

    // Check if we need to refresh the session
    if (now - this.state.lastActivity > this.config.refreshThresholdMs) {
      await this.refreshSession();
    }
  }

  private async checkSessionRefresh() {
    const now = Date.now();
    // Only handle session refresh, not timeout
    if (now - this.state.lastActivity > this.config.refreshThresholdMs) {
      await this.refreshSession();
    }
  }

  private async refreshSession() {
    if (this.state.isRefreshing) return;

    try {
      this.state.isRefreshing = true;
      await this.saveState();

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        this.state.lastActivity = Date.now();
        await this.saveState();
      }
    } catch (error) {
      errorHandler.handleError(error, 'SessionManager');
      // Don't handle session timeout here
    } finally {
      this.state.isRefreshing = false;
      await this.saveState();
    }
  }

  // This function will only be called manually when user clicks logout
  public async logout() {
    try {
      // Clear session data
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('session_state');
      
      // Navigate to login
      router.replace('/auth/login');
    } catch (error) {
      errorHandler.handleError(error, 'SessionManager');
    }
  }

  public async resetSession() {
    this.state = {
      lastActivity: Date.now(),
      isRefreshing: false
    };
    await this.saveState();
  }

  public cleanup() {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }

    if (Platform.OS === 'web') {
      window.removeEventListener('mousemove', this.updateActivity.bind(this));
      window.removeEventListener('keydown', this.updateActivity.bind(this));
      window.removeEventListener('click', this.updateActivity.bind(this));
      window.removeEventListener('scroll', this.updateActivity.bind(this));
    }
  }
}

export const sessionManager = SessionManager.getInstance(); 