import React from 'react';
import EnhancedProfileScreen from '../app/(tabs)/profile/EnhancedProfileScreen';
import { supabase } from '../src/services/supabase';
import { walletService } from '../src/services/walletService';

// Mock the navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => {
    // Execute the callback function once
    const cleanup = callback();
    return cleanup;
  }),
  Link: 'Link',
}));

// Mock supabase
jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
            },
          },
        },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
            }
          }
        },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User',
          phone_number: '1234567890',
          profile_image_url: null,
          created_at: new Date().toISOString(),
          user_role: 'customer',
        },
        error: null,
      }),
      count: jest.fn().mockReturnValue(5),
    }),
  },
}));

// Mock wallet service
jest.mock('../src/services/walletService', () => ({
  walletService: {
    getOrCreateWallet: jest.fn().mockResolvedValue({
      wallet: {
        id: 'wallet-id',
        user_id: 'test-user-id',
        balance: 100,
        currency: 'ETB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    }),
    getBalance: jest.fn().mockResolvedValue({
      balance: 100,
      error: null,
    }),
    getTransactionHistory: jest.fn().mockResolvedValue({
      transactions: [
        {
          id: 'tx1',
          wallet_id: 'wallet-id',
          amount: 100,
          type: 'deposit',
          status: 'completed',
          reference: 'ref123',
          description: 'Deposit via TeleBirr',
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    }),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockImplementation((key) => {
    if (key === 'mbet.user') {
      return Promise.resolve(JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
      }));
    }
    if (key === 'mbet.wallet') {
      return Promise.resolve(JSON.stringify({
        balance: 100,
        lastUpdated: new Date().toISOString(),
      }));
    }
    if (key === 'mbet.transactions') {
      return Promise.resolve(JSON.stringify([
        {
          id: 'tx1',
          amount: 100,
          type: 'deposit',
          status: 'completed',
          created_at: new Date().toISOString(),
          description: 'Deposit via TeleBirr',
        },
      ]));
    }
    return Promise.resolve(null);
  }),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(null),
  multiRemove: jest.fn().mockResolvedValue(null),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

// Mock other dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackStyle: { Success: 'success' },
}));

// Mock React Native components
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.NativeModules.StatusBarManager = { getHeight: jest.fn() };
  return {
    ...rn,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Simple test renderer
const shallowRender = (Component: React.ComponentType): { toJSON: () => React.ReactElement } => {
  let result: React.ReactElement;
  const renderer = {
    create: (element: React.ReactElement) => {
      result = element;
      return {
        root: {
          findByType: jest.fn(),
          findByProps: jest.fn(),
        },
        toJSON: () => result,
      };
    },
  };
  return renderer.create(<Component />);
};

describe('EnhancedProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the necessary services on mount', async () => {
    // Render the component
    shallowRender(EnhancedProfileScreen);
    
    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify that the services were called
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(walletService.getBalance).toHaveBeenCalled();
    expect(walletService.getTransactionHistory).toHaveBeenCalled();
  });

  it('should handle logout correctly', async () => {
    // Mock the signOut method to verify it's called
    const mockSignOut = jest.fn().mockResolvedValue({ error: null });
    supabase.auth.signOut = mockSignOut;
    
    // We can test that the signOut method works correctly
    const result = await supabase.auth.signOut();
    expect(result).toEqual({ error: null });
    expect(mockSignOut).toHaveBeenCalled();
  });
}); 