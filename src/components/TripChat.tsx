import { useAuth } from '@/contexts/AuthContext';

interface TripChatProps {
  tripId: string;
  userId: string;
}

export default function TripChat({ tripId, userId }: TripChatProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-[400px] border rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold">Trip Chat</h3>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-primary/10 p-6 rounded-lg max-w-md w-full">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Coming in the next update!</h3>
          <p className="text-sm text-muted-foreground">
            We're working hard to bring you an amazing group chat experience. Stay tuned for the next update!
          </p>
        </div>
      </div>
      
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Chat will be available soon..."
            className="flex-1 px-4 py-2 border rounded-lg bg-white text-muted-foreground cursor-not-allowed"
            disabled
          />
          <button
            className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium cursor-not-allowed"
            disabled
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
