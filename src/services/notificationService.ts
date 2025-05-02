import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification settings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Interface for notification data
export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const notificationService = {
  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    let token = null;
    
    if (Device.isDevice) {
      // Check if we have permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If no permission, ask for it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // If we don't have permission after asking, return null
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification');
        return null;
      }
      
      // Get Expo push token
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })).data;
      
      console.log('Expo push token:', token);
      
      // Register token with our backend
      await this.registerDeviceToken(token);
    } else {
      console.log('Must use physical device for push notifications');
    }
    
    // Set up notification channel on Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A7EA4',
      });
    }
    
    return token;
  },
  
  /**
   * Register device token with our backend
   */
  async registerDeviceToken(token: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      // Check if token already exists
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('*')
        .eq('token', token)
        .maybeSingle();
        
      if (existingDevice) {
        // Update last updated time
        await supabase
          .from('devices')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', existingDevice.id);
      } else {
        // Create new device
        await supabase
          .from('devices')
          .insert({
            user_id: user.user.id,
            token,
            platform: Platform.OS,
            device_name: Device.modelName || 'Unknown',
          });
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  },
  
  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notification: NotificationData): Promise<string> {
    const { title, body, data } = notification;
    
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // Show immediately
    });
  },
  
  /**
   * Send a notification to a specific user
   */
  async sendUserNotification(userId: string, notification: NotificationData): Promise<boolean> {
    try {
      // In a real app, we would use a server function to send this
      // For now, we'll just save it to the database
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          read: false,
        });
        
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  },
  
  /**
   * Get notifications for the current user
   */
  async getUserNotifications(): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  },
  
  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },
  
  /**
   * Clear all notifications for the current user
   */
  async clearAllNotifications(): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.user.id);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  },
  
  /**
   * Get notification count
   */
  async getUnreadNotificationCount(): Promise<number> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  },
}; 