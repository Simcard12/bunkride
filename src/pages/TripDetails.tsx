
import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import TripChat from "@/components/TripChat";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ref, onValue, off, set, remove, get } from "firebase/database";
import { database } from "@/firebase";

interface TripRequest {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: number;
}

interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  availableSeats: number;
  totalSeats: number;
  pricePerPerson: number;
  creatorId: string;  // Changed from createdBy to match the data structure
  creatorName: string;
  creatorCollege: string;
  status: 'active' | 'completed' | 'cancelled';
  requests?: { [userId: string]: Omit<TripRequest, 'userId'> };
}

const TripDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isFromDashboard, setIsFromDashboard] = useState(false);
  
  // Check if we came from dashboard or find-trips
  useEffect(() => {
    setIsFromDashboard(location.state?.from === 'dashboard');
  }, [location]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (isFromDashboard) {
      navigate('/dashboard?tab=upcoming');
    } else {
      navigate('/find-trips');
    }
  }, [isFromDashboard, navigate]);

  // Handle request to join trip
  const handleRequestToJoin = async () => {
    if (!user || !trip) return;

    try {
      // Add request to trip's requests
      const requestRef = ref(database, `tripRequests/${trip.id}_${user.uid}`);
      await set(requestRef, {
        userId: user.uid,
        userName: user.name || 'Unknown User',
        userEmail: user.email || '',
        status: 'pending',
        requestedAt: Date.now()
      });

      // Add trip to user's requested trips
      const userTripRef = ref(database, `user-requests/${user.uid}/${trip.id}`);
      await set(userTripRef, true);

      toast.success('Trip request sent successfully!');
    } catch (error) {
      console.error('Error requesting to join trip:', error);
      toast.error('Failed to send trip request');
    }
  };

  // Handle cancel request
  const handleCancelRequest = async () => {
    if (!user || !trip) return;

    try {
      // Remove request from trip's requests
      const requestRef = ref(database, `tripRequests/${trip.id}_${user.uid}`);
      await remove(requestRef);

      // Remove trip from user's requested trips
      const userTripRef = ref(database, `user-requests/${user.uid}/${trip.id}`);
      await remove(userTripRef);

      toast.success('Trip request cancelled');
    } catch (error) {
      console.error('Error cancelling trip request:', error);
      toast.error('Failed to cancel trip request');
    }
  };

  // Load trip data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!id) {
      toast.error('No trip ID provided');
      handleBack();
      return;
    }

    // Load trip from Firebase
    const tripRef = ref(database, `trips/${id}`);
    onValue(tripRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTrip({ 
          id: snapshot.key || '', 
          ...data 
        } as Trip);
      } else {
        toast.error('Trip not found');
        handleBack();
      }
    });

    // Cleanup function
    return () => {
      off(tripRef);
    };
  }, [id, isAuthenticated, navigate, handleBack]);

  const handleApproveRequest = async (userId: string) => {
    if (!trip?.id) return;
    
    try {
      // Update request status to approved
      const requestRef = ref(database, `tripRequests/${trip.id}_${userId}`);
      const requestData = (await get(requestRef)).val();
      
      await set(requestRef, {
        ...requestData,
        status: 'approved'
      });
      
      // Add user to trip participants
      const participantRef = ref(database, `trip-participants/${trip.id}/${userId}`);
      await set(participantRef, true);
      
      toast.success('Request approved');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    if (!trip?.id) return;
    
    try {
      // Update request status to rejected
      const requestRef = ref(database, `tripRequests/${trip.id}_${userId}`);
      const requestData = (await get(requestRef)).val();
      
      await set(requestRef, {
        ...requestData,
        status: 'rejected'
      });
      
      // Remove user from trip participants if they were added
      const participantRef = ref(database, `trip-participants/${trip.id}/${userId}`);
      await remove(participantRef);
      
      toast.success('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  // Check if user has already requested to join this trip
  const [hasRequested, setHasRequested] = useState(false);
  
  // Check if user has already requested to join this trip
  useEffect(() => {
    if (!user?.uid || !trip?.id) return;
    
    const requestRef = ref(database, `tripRequests/${trip.id}_${user.uid}`);
    onValue(requestRef, (snapshot) => {
      setHasRequested(!!snapshot.val());
    });
    
    return () => off(requestRef);
  }, [user?.uid, trip?.id]);

  // Get the status of the user's request to join this trip
  const getUserRequestStatus = () => {
    if (!user?.uid || !trip?.requests) return null;
    const request = trip.requests[user.uid];
    return request ? { ...request, userId: user.uid } : null;
  };
  if (!isAuthenticated || !user) {
    return null;
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Trip Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The trip you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={handleBack}>
                Browse Other Trips
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const userRequest = getUserRequestStatus();
  const isCreator = trip.creatorId === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10 relative overflow-hidden">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6 sm:pt-28 sm:pb-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/find-trips')}>
            ← Back to Trips
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">
                  {trip.from} → {trip.to}
                </CardTitle>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{format(new Date(trip.date), 'EEEE, MMMM d, yyyy')}</span>
                  <span>{trip.time}</span>
                  <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                    {trip.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">₹{trip.pricePerPerson}</div>
                <div className="text-sm text-muted-foreground">per person</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details">Trip Details</TabsTrigger>
                <TabsTrigger 
                  value="chat" 
                  disabled={!isCreator && (!userRequest || userRequest.status !== 'approved')}
                >
                  Group Chat
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Trip Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Route:</span>
                    <span>{trip.from} → {trip.to}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(trip.date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{trip.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available Seats:</span>
                    <span>{trip.availableSeats} of {trip.totalSeats}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Pricing Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Trip Cost:</span>
                    <span>₹{trip.pricePerPerson * trip.totalSeats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number of Passengers:</span>
                    <span>{trip.totalSeats}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Cost per Person:</span>
                    <span>₹{trip.pricePerPerson}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Information */}
            <div>
              <h3 className="font-semibold mb-3">Host Information</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {trip.creatorName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{trip.creatorName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {trip.creatorCollege}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isCreator && (
              <div className="flex gap-4 pt-4 border-t">
                {userRequest ? (
                  <div className="flex flex-col gap-3 w-full p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={
                          userRequest.status === 'approved' ? 'default' : 
                          userRequest.status === 'pending' ? 'secondary' : 'destructive'
                        }
                        className="text-sm py-1.5 px-3"
                      >
                        Request {userRequest.status}
                      </Badge>
                      {userRequest.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // Add functionality to remove request
                            toast.info('Feature to remove request coming soon!');
                          }}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Remove Request
                        </Button>
                      )}
                    </div>
                    {userRequest.status === 'approved' && (
                      <div className="text-sm text-muted-foreground mt-1">
                        🎉 Your request has been approved! The host will share contact details with you soon.
                      </div>
                    )}
                    {userRequest.status === 'pending' && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Your request is pending approval. The host will review it shortly.
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={handleRequestToJoin}
                    disabled={trip.availableSeats === 0 || trip.status !== 'active'}
                    className="w-full py-6 text-base"
                  >
                    {trip.availableSeats === 0 ? 'Fully Booked' : 
                     trip.status !== 'active' ? 'Trip Inactive' : 'Request to Join'}
                  </Button>
                )}
              </div>
            )}

            {/* Trip Guidelines */}
            <div className="bg-accent/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Trip Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Contact details will be shared only after request approval</li>
                <li>• Be punctual and respectful to fellow travelers</li>
                <li>• Coordinate pickup points and payment with the host</li>
                <li>• Follow college travel policies and safety guidelines</li>
              </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="chat" className="mt-0">
                {(isCreator || userRequest?.status === 'approved') && (
                  <div className="border rounded-lg overflow-hidden">
                    <TripChat tripId={trip.id} userId={user?.id || ''} />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripDetails;
