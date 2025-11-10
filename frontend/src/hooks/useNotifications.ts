import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { message as antdMessage } from 'antd';

interface Notification {
  type: string;
  data: any;
  timestamp: string;
}

export function useNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Connect to WebSocket server
    const newSocket = io('/notifications', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to notification server:', data);
      antdMessage.success('Real-time notifications enabled');
    });

    // Listen for various notification types
    newSocket.on('study:new', (notification: Notification) => {
      console.log('New study:', notification);
      setNotifications((prev) => [notification, ...prev]);
      antdMessage.info('New study available');
    });

    newSocket.on('study:update', (notification: Notification) => {
      console.log('Study updated:', notification);
      setNotifications((prev) => [notification, ...prev]);
      antdMessage.info('Study updated');
    });

    newSocket.on('source:status', (notification: Notification) => {
      console.log('Source status changed:', notification);
      setNotifications((prev) => [notification, ...prev]);
      antdMessage.info('Imaging source status changed');
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('Notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
      antdMessage.info(notification.data.message || 'New notification');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    socket,
    isConnected,
    notifications,
    clearNotifications,
    removeNotification,
  };
}
