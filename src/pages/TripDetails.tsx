
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import TripChat from "@/components/TripChat";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDatabase, ref, remove, set } from "firebase/database";

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
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load trip from localStorage
    const storedTrips = localStorage.getItem('bunkride_trips');
    if (storedTrips) {
      const trips = JSON.parse(storedTrips);
      const foundTrip = trips.find((t: Trip) => t.id === id);
      setTrip(foundTrip || null);
    }
  }, [id, isAuthenticated, navigate]);

  const handleRemoveRequest = async () => {
    if (!trip || !user?.id) return;
    
    setIsRemoving(true);
    try {
      // Update local storage
      const storedTrips = localStorage.getItem('bunkride_trips');
      if (storedTrips) {
        const trips = JSON.parse(storedTrips);
        const updatedTrips = trips.map((t: Trip) => {
          if (t.id === trip.id) {
            const updatedRequests = { ...t.requests };
            delete updatedRequests[user.id];
            return { ...t, requests: updatedRequests };
          }
          return t;
        });
        localStorage.setItem('bunkride_trips', JSON.stringify(updatedTrips));
      }

      // Update state
      setTrip(prev => {
        if (!prev) return null;
        const updatedRequests = { ...prev.requests };
        delete updatedRequests[user.id];
        return { ...prev, requests: updatedRequests };
      });

      // Update Firebase
      const db = getDatabase();
      const requestRef = ref(db, `trips/${trip.id}/requests/${user.id}`);
      await remove(requestRef);
      
      toast.success('Request removed successfully');
    } catch (error) {
      console.error('Error removing request:', error);
      toast.error('Failed to remove request. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRequestToJoin = async () => {
    console.log('handleRequestToJoin called');
    console.log('Current trip:', trip);
    console.log('Current user:', user);
    
    if (!trip || !user || !user.id) {
      console.log('Missing trip, user, or user.id');
      return;
    }

    // Debug log the comparison
    console.log(`Comparing trip.creatorId (${trip.creatorId}) with user.id (${user.id})`);
    
    // Prevent users from sending requests to their own trips
    if (trip.creatorId === user.id) {
      console.log('User is the trip creator, showing error');
      toast.error("Bruhhh, you're already in the trip!");
      return;
    }

    // Check if user already sent a request
    const existingRequest = trip.requests?.[user.id];
    if (existingRequest) {
      toast.error("You have already sent a request for this trip!");
      return;
    }

    const newRequest = {
      userId: user.id,
      userName: user.name || 'Unknown User',
      userEmail: user.email || '',
      status: 'pending' as const,
      requestedAt: Date.now()
    };

    // Update the trip with the new request
    const storedTrips = localStorage.getItem('bunkride_trips');
    if (storedTrips) {
      const trips = JSON.parse(storedTrips);
      const updatedTrips = trips.map((t: Trip) => {
        if (t.id === trip.id) {
          return {
            ...t,
            requests: {
              ...(t.requests || {}),
              [user.id!]: {
                userName: user.name || 'Unknown User',
                userEmail: user.email || '',
                status: 'pending',
                requestedAt: Date.now()
              }
            }
          };
        }
        return t;
      });

      localStorage.setItem('bunkride_trips', JSON.stringify(updatedTrips));
      setTrip(prev => prev ? {
        ...prev,
        requests: {
          ...(prev.requests || {}),
          [user.id!]: {
            userName: user.name || 'Unknown User',
            userEmail: user.email || '',
            status: 'pending',
            requestedAt: Date.now()
          }
        }
      } : null);
    }

    try {
      // Update Firebase
      const db = getDatabase();
      const requestRef = ref(db, `trips/${trip.id}/requests/${user.id}`);
      const requestData = {
        userId: user.id,
        userName: user.name || 'Unknown User',
        userEmail: user.email || '',
        status: 'pending',
        requestedAt: Date.now()
      };
      console.log('Sending request data:', requestData);
      await set(requestRef, requestData);
      
      toast.success("Request sent! The host will review your request.");
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request. Please try again.');
      
      // Revert local storage changes if Firebase update fails
      const storedTrips = localStorage.getItem('bunkride_trips');
      if (storedTrips) {
        const trips = JSON.parse(storedTrips);
        const originalTrip = trips.find((t: Trip) => t.id === trip.id);
        if (originalTrip) {
          setTrip(originalTrip);
        }
      }
    }
  };

  const getUserRequestStatus = () => {
    if (!user?.id || !trip?.requests) return null;
    const request = trip.requests[user.id];
    return request ? { ...request, userId: user.id } : null;
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
              <Button onClick={() => navigate('/find-trips')}>
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
          <Button variant="outline" onClick={() => navigate(-1)}>
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
                <div className="text-3xl font-bold text-primary">
                  {trip.pricePerPerson <= 0 ? 'Cost TBD' : `₹${trip.pricePerPerson}`}
                </div>
                {trip.pricePerPerson > 0 && (
                  <div className="text-sm text-muted-foreground">per person</div>
                )}
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
                  {trip.pricePerPerson > 0 ? (
                    <>
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
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      The cost will be discussed and finalized with the host.
                    </div>
                  )}
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
                          onClick={handleRemoveRequest}
                          disabled={isRemoving}
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
