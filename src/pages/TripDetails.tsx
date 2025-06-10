
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

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

  const handleRequestToJoin = () => {
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

    toast.success("Request sent! The host will review your request.");
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
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
            {/* Trip Information */}
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
                  <div className="flex items-center gap-4">
                    <Badge variant={
                      userRequest.status === 'approved' ? 'default' : 
                      userRequest.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      Request {userRequest.status}
                    </Badge>
                    {userRequest.status === 'approved' && (
                      <div className="text-sm text-muted-foreground">
                        The host will share contact details with you soon.
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={handleRequestToJoin}
                    disabled={trip.availableSeats === 0 || trip.status !== 'active'}
                    className="flex-1 md:flex-none"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripDetails;
