import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

export interface Notification {
  id: string;
  type: 'partner' | 'user' | 'redemption' | 'submission' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Load notifications from localStorage
const loadStoredNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem('admin_notifications');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save notifications to localStorage
const saveNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem('admin_notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(loadStoredNotifications());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
    saveNotifications(notifications);
  }, [notifications]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
      });

      browserNotif.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotif.close();
      };

      // Auto-close after 10 seconds for non-high priority
      if (notification.priority !== 'high') {
        setTimeout(() => browserNotif.close(), 10000);
      }
    }
  };

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    showBrowserNotification(newNotification);
  };

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setIsLoading(true);
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET || 'zabava';
      
      // Fetch recent activities and convert to notifications
      // Fetch overview first (this should always work)
      const overviewRes = await fetch(`${API_BASE_URL}/api/admin/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-secret': adminSecret
        }
      });
      
      // Try analytics but don't fail if it doesn't work
      let analyticsRes = null;
      try {
        analyticsRes = await fetch(`${API_BASE_URL}/api/admin/analytics?mode=metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-admin-secret': adminSecret
          }
        });
      } catch (analyticsError) {
        if (import.meta.env.VITE_DEBUG) {
          console.log('Analytics endpoint not available, continuing without it');
        }
      }

      const newNotifications: Notification[] = [];
      
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        
        // Check for pending approvals
        if (overviewData.quickActions?.pendingPartnerApprovals > 0) {
          newNotifications.push({
            id: `pending-${Date.now()}`,
            type: 'partner',
            title: 'Pending Partner Approvals',
            message: `${overviewData.quickActions.pendingPartnerApprovals} partner(s) awaiting approval`,
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'high',
            actionUrl: '/admin/partners'
          });
        }

        // Check for new QR codes
        if (overviewData.totals?.qrsGeneratedToday > 0) {
          newNotifications.push({
            id: `qrs-${Date.now()}`,
            type: 'submission',
            title: 'New QR Codes Generated',
            message: `${overviewData.totals.qrsGeneratedToday} new QR codes generated today`,
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'low'
          });
        }
      }

      if (analyticsRes && analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        
        // Process recent activity into notifications
        if (analyticsData.recentActivity && Array.isArray(analyticsData.recentActivity)) {
          analyticsData.recentActivity.slice(0, 5).forEach((activity: any, index: number) => {
            newNotifications.push({
              id: `activity-${Date.now()}-${index}`,
              type: activity.type || 'system',
              title: activity.title || 'System Activity',
              message: activity.description || activity.message || 'New activity detected',
              timestamp: activity.timestamp || new Date().toISOString(),
              read: false,
              priority: 'medium',
              metadata: activity
            });
          });
        }
      }

      // Only add notifications that are newer than last check
      const lastCheck = new Date(lastCheckTime);
      const genuinelyNew = newNotifications.filter(n => 
        new Date(n.timestamp) > lastCheck
      );

      if (genuinelyNew.length > 0) {
        setNotifications(prev => {
          // Filter out duplicates based on message and type
          const existingKeys = new Set(prev.map(n => `${n.type}-${n.message}`));
          const unique = genuinelyNew.filter(n => 
            !existingKeys.has(`${n.type}-${n.message}`)
          );
          
          return [...unique, ...prev].slice(0, 50);
        });

        // Show browser notifications for genuinely new items
        genuinelyNew.forEach(showBrowserNotification);
      }

      setLastCheckTime(Date.now());
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Delete a notification
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem('admin_notifications');
  };

  // Poll for notifications every 30 seconds when user is admin
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [user, token]);

  // Listen for visibility change to fetch when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.role === 'admin') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};