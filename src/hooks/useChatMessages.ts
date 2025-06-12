import { useState, useEffect } from 'react';
import { ref, query, orderByChild, limitToLast, onValue, off, push, remove, set, serverTimestamp } from 'firebase/database';
import { database } from '@/firebase';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  timestamp: any;
}

export function useChatMessages(tripId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch messages
  useEffect(() => {
    if (!tripId || !userId) return;

    const messagesRef = ref(database, `trips/${tripId}/messages`);
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(100)
    );

    const handleData = (snapshot: any) => {
      try {
        const messagesData = snapshot.val() || {};
        const fetchedMessages = Object.entries(messagesData).map(([key, value]: [string, any]) => ({
          id: key,
          text: value.text || '',
          userId: value.userId || '',
          userName: value.userName || 'Anonymous',
          userPhotoURL: value.userPhotoURL || '',
          timestamp: value.timestamp
        }));
        
        setMessages(fetchedMessages);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    onValue(messagesQuery, handleData, (error) => {
      setError(error);
      setLoading(false);
    });

    return () => {
      off(messagesQuery, 'value', handleData);
    };
  }, [tripId, userId]);

  // Send message
  const sendMessage = async (text: string, user: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    name?: string;
    profilePicture?: string;
  }) => {
    if (!tripId || !userId) return;

    try {
      const messagesRef = ref(database, `trips/${tripId}/messages`);
      await push(messagesRef, {
        text,
        userId: user.uid,
        userName: user.displayName || user.name || 'Anonymous',
        userPhotoURL: user.photoURL || user.profilePicture || '',
        timestamp: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    if (!tripId) return;
    
    try {
      const messageRef = ref(database, `trips/${tripId}/messages/${messageId}`);
      await remove(messageRef);
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage
  };
}
