import { useState, useCallback, useEffect } from 'react';
import { Message } from '../types';
import { StorageManager } from '../utils/storage';
import { NotificationManager } from '../utils/notifications';
import { FileTransferManager } from '../utils/fileTransfer';

interface UseMessageHandlingReturn {
  messages: Message[];
  addMessage: (message: Message) => void;
  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (text: string, connection: any) => void;
  sendTypingIndicator: (isTyping: boolean, connection: any) => void;
  unreadCount: number;
  markAsRead: () => void;
}

export const useMessageHandling = (): UseMessageHandlingReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    if (message.status === 'received' && message.type === 'text') {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string) => {
    const stored = await StorageManager.loadMessages(roomId);
    setMessages(stored);
  }, []);

  const sendMessage = useCallback((text: string, connection: any) => {
    if (!text.trim() || !connection || !connection.open) {
      return;
    }

    const message: Message = {
      id: Math.random().toString(36),
      type: 'text',
      sender: 'You',
      time: new Date().toISOString(),
      payload: text.trim(),
      status: 'sent'
    };

    connection.send(JSON.stringify(message));
    addMessage(message);
    StorageManager.saveMessage(message);
  }, [addMessage]);

  const sendTypingIndicator = useCallback((isTyping: boolean, connection: any) => {
    if (!connection || !connection.open) return;

    const msg = {
      type: 'typing',
      sender: 'You',
      isTyping
    };

    connection.send(JSON.stringify(msg));
  }, []);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    NotificationManager.updateBadge(0);
  }, []);

  return {
    messages,
    addMessage,
    loadMessages,
    sendMessage,
    sendTypingIndicator,
    unreadCount,
    markAsRead
  };
};
