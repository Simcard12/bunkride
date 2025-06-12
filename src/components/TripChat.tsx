import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  limit, 
  DocumentData, 
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

// Extend the AppUser type to include the properties we need
declare module '@/contexts/AuthContext' {
  interface AppUser {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    email?: string | null;
  }
}

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  timestamp: any;
}

interface TripChatProps {
  tripId: string;
  userId: string;
}

export default function TripChat({ tripId, userId }: TripChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages from Firestore
  useEffect(() => {
    if (!tripId || !user?.uid) return;

    const messagesRef = collection(firestore, 'trips', tripId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          userId: data.userId || '',
          userName: data.userName || 'Anonymous',
          userPhotoURL: data.userPhotoURL || '',
          timestamp: data.timestamp
        } as Message;
      });
      
      setMessages(fetchedMessages.reverse());
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [tripId, user?.uid]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user?.uid || !tripId) return;

    try {
      await addDoc(collection(firestore, 'trips', tripId, 'messages'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || user.name || 'Anonymous',
        userPhotoURL: user.photoURL || user.profilePicture || '',
        timestamp: serverTimestamp() as any
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg overflow-hidden bg-white">
      {/* Chat header */}
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Trip Chat</h3>
        <div className="text-sm text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.userId === user?.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`flex max-w-[80%] ${message.userId === user?.uid ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.userPhotoURL} alt={message.userName} />
                    <AvatarFallback>
                      {message.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`p-3 rounded-lg ${
                      message.userId === user?.uid 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        message.userId === user?.uid ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {message.userName}
                      </span>
                      <span className={`text-xs ${
                        message.userId === user?.uid ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Message input */}
      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!newMessage.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
