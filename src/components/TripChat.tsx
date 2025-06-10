import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  timestamp: number;
}

interface TripChatProps {
  tripId: string;
  userId: string;
}

export default function TripChat({ tripId, userId }: TripChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tripId) return;

    const messagesRef = ref(database, `tripChats/${tripId}/messages`);
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(100)
    );

    const handleNewMessage = (snapshot: any) => {
      const messagesData: Message[] = [];
      snapshot.forEach((childSnapshot: any) => {
        messagesData.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
      setMessages(messagesData);
    };

    onValue(messagesQuery, handleNewMessage);

    return () => {
      off(messagesQuery, 'value', handleNewMessage);
    };
  }, [tripId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      // Create a message object with only defined values
      const newMessage: any = {
        text: message,
        userId: user.id,
        userName: user.name,
        timestamp: Date.now(),
      };

      // Only add userPhoto if it exists
      if (user.profilePicture) {
        newMessage.userPhoto = user.profilePicture;
      }

      const messagesRef = ref(database, `tripChats/${tripId}/messages`);
      await push(messagesRef, newMessage);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold">Trip Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Working on it...
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-[80%] ${msg.userId === userId ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-8 w-8 m-1">
                  <AvatarImage src={msg.userPhoto} />
                  <AvatarFallback>
                    {msg.userName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`mx-2 p-3 rounded-lg ${
                    msg.userId === userId
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted rounded-bl-none'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {msg.userName} • {format(new Date(msg.timestamp), 'h:mm a')}
                  </div>
                  <div>{msg.text}</div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={!message.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
