
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, startOfDay } from "date-fns"; // Added startOfDay
import { toast } from "sonner";
import { database } from "@/firebase";
import { ref, onValue, query, orderByChild, equalTo, set, serverTimestamp, remove, get } from "firebase/database";

// Updated TripRequest and Trip interfaces
interface TripRequest {
  userId: string; 
  userName: string;
  userEmail: string; 
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number; // Firebase Server Timestamp
}

interface Trip {
  id: string; // Firebase key
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  availableSeats: number;
  totalSeats: number;
  pricePerPerson: number;
  totalTripCost: number; 
  creatorId: string; // UID of the creator
  creatorName: string;
  creatorCollege: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number; // Firebase Server Timestamp
  requests?: { [requestingUserId: string]: TripRequest }; 
}

const FindTrips = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]); // Raw trips from user's college
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [searchDestination, setSearchDestination] = useState("");
  // selectedTrip state seems unused, consider removing if not needed for a modal later
  // const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [seatsFilter, setSeatsFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Added loading state

  useEffect(() => {
    if (!isAuthenticated || !user || !user.college) {
      if (!isAuthenticated) navigate('/login');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const tripsQuery = query(
      ref(database, 'trips'), 
      orderByChild('creatorCollege'), 
      equalTo(user.college)
    );

    const unsubscribe = onValue(tripsQuery, (snapshot) => {
      const tripsData = snapshot.val();
      const loadedTrips: Trip[] = [];
      if (tripsData) {
        Object.keys(tripsData).forEach(key => {
          const trip = { ...tripsData[key], id: key }; // Ensure id is set from the Firebase key
          // Apply initial filters: active, future, and not created by current user
          if (
            trip.status === 'active' && 
            startOfDay(new Date(trip.date)) >= startOfDay(new Date()) &&
            trip.creatorId !== user.id
          ) {
            loadedTrips.push(trip);
          }
        });
      }
      setTrips(loadedTrips.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time)));
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase trips fetch error: ", error);
      toast.error("Failed to load trips.");
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // This effect now filters the `trips` state which is already pre-filtered by college, status, date, and creator.
    let currentFilteredTrips = [...trips];

    if (searchDestination) {
      currentFilteredTrips = currentFilteredTrips.filter(trip => 
        trip.to.toLowerCase().includes(searchDestination.toLowerCase()) ||
        trip.from.toLowerCase().includes(searchDestination.toLowerCase())
      );
    }

    if (dateFilter) {
      currentFilteredTrips = currentFilteredTrips.filter(trip => trip.date === dateFilter);
    }

    if (seatsFilter) {
      const seats = parseInt(seatsFilter);
      currentFilteredTrips = currentFilteredTrips.filter(trip => trip.availableSeats >= seats);
    }

    setFilteredTrips(currentFilteredTrips);
  }, [trips, searchDestination, dateFilter, seatsFilter]);

  // Helper to get current user's request for a trip
  const getUserRequest = (trip: Trip): TripRequest | null => {
    if (!user || !user.id || !trip.requests) return null;
    return trip.requests[user.id] || null;
  };

  const handleRequestToJoin = async (trip: Trip) => {
    if (!user || !user.id || !user.name || !user.email) {
      toast.error("User information is missing. Please re-login.");
      navigate('/login');
      return;
    }
    
    // Prevent users from sending requests to their own trips
    if (trip.creatorId === user.id) {
      toast.error("Bruhhh, you're already in the trip!");
      return;
    }

    if (trip.availableSeats <= 0) {
      toast.info("This trip is fully booked.");
      return;
    }

    const existingUserRequest = getUserRequest(trip);
    if (existingUserRequest) {
      toast.info(`You have already sent a '${existingUserRequest.status}' request for this trip.`);
      return;
    }

    const requestPath = `trips/${trip.id}/requests/${user.id}`;
    const newRequestData = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email, 
      status: 'pending',
      requestedAt: serverTimestamp()
    } as const;

    try {
      await set(ref(database, requestPath), newRequestData);
      toast.success("Request sent successfully!");
      // Optimistic update or rely on onValue is generally better here,
      // but for simplicity, we'll let onValue handle the update.
    } catch (error) {
      console.error("Firebase request join error: ", error);
      toast.error("Failed to send request. Please try again.");
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Find Trips</h1>
          <p className="text-muted-foreground">Discover rides shared by fellow students</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Search destinations..."
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                />
              </div>
              
              <div>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <Select value={seatsFilter} onValueChange={setSeatsFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Min seats needed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1+ seats</SelectItem>
                    <SelectItem value="2">2+ seats</SelectItem>
                    <SelectItem value="3">3+ seats</SelectItem>
                    <SelectItem value="4">4+ seats</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchDestination("");
                    setDateFilter("");
                    setSeatsFilter("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trips List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="text-center col-span-full">Loading trips...</p>
          ) : filteredTrips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">No trips found matching your criteria</p>
                <Button onClick={() => navigate('/create-trip')}>
                  Create a Trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTrips.map((trip) => {
              const userRequest = getUserRequest(trip);
              
              return (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                  <CardContent className="pt-6 flex-1 flex flex-col">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-lg md:text-xl font-semibold line-clamp-1">
                          {trip.from} → {trip.to}
                        </h3>
                        <div className="text-right">
                          <div className="text-xl md:text-2xl font-bold text-primary">
                            ₹{trip.pricePerPerson}
                          </div>
                          <div className="text-xs text-muted-foreground">per person</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="whitespace-nowrap">{format(new Date(trip.date), 'MMM d, yyyy')}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="whitespace-nowrap">{trip.time}</span>
                        <Badge variant="outline" className="ml-auto">
                          {trip.availableSeats} seat{trip.availableSeats !== 1 ? 's' : ''} left
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <div className="text-muted-foreground">
                          Total cost: <span className="font-medium">₹{trip.pricePerPerson * trip.totalSeats}</span> 
                          <span className="text-muted-foreground/80"> ({trip.totalSeats} passengers)</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-muted-foreground">Host: </span>
                          <span className="font-medium">{trip.creatorName}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {trip.creatorCollege}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground flex-1">
                          {trip.availableSeats > 0 ? (
                            <span className="text-green-600">Seats available</span>
                          ) : (
                            <span className="text-destructive">Fully booked</span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="whitespace-nowrap">
                              <span className="sr-only sm:not-sr-only">View </span>Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Trip Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Route & Timing</h4>
                                <p>{trip.from} → {trip.to}</p>
                                <p>{format(new Date(trip.date), 'EEEE, MMMM d, yyyy')} at {trip.time}</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Pricing</h4>
                                <p>₹{trip.pricePerPerson} per person</p>
                                <p className="text-sm text-muted-foreground">
                                  Total trip cost: ₹{trip.totalTripCost}
                                </p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Availability</h4>
                                <p>{trip.availableSeats} out of {trip.totalSeats} seats available</p>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Host Information</h4>
                                <p>{trip.creatorName}</p>
                                <Badge variant="secondary">{trip.creatorCollege}</Badge>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {userRequest ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              userRequest.status === 'approved' ? 'default' : 
                              userRequest.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {userRequest.status === 'pending' ? 'Request Sent' : userRequest.status.charAt(0).toUpperCase() + userRequest.status.slice(1)}
                            </Badge>
                            {userRequest.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={async () => {
                                  if (!user || !user.id) return;
                                  const requestPath = `trips/${trip.id}/requests/${user.id}`;
                                  try {
                                    await remove(ref(database, requestPath));
                                    toast.success("Request removed successfully");
                                  } catch (error) {
                                    console.error("Firebase remove request error: ", error);
                                    toast.error("Failed to remove request.");
                                  }
                                }}
                              >
                                <span className="sr-only sm:not-sr-only">Remove </span>Request
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleRequestToJoin(trip)}
                            disabled={trip.availableSeats === 0}
                          >
                            {trip.availableSeats === 0 ? 'Fully Booked' : 'Join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FindTrips;
