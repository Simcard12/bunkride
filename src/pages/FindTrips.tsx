
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { ref, onValue, query, orderByChild, equalTo, set, serverTimestamp, remove, get } from "firebase/database";
import { CalendarDays, Clock, User, Users, Eye, MapPin, DollarSign, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { database } from "@/firebase";
import TripDetails from "./TripDetails";

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
  destination: string; // Added destination field
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
  
  // State for trips and filters
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [searchDestination, setSearchDestination] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [seatsFilter, setSeatsFilter] = useState("");
  
  // State for trip details modal
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
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
    
    // First filter out trips with 0 available seats
    currentFilteredTrips = currentFilteredTrips.filter(trip => trip.availableSeats > 0);

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

  // Get request status for a specific trip
  const getRequestStatus = (tripId: string) => {
    if (!user?.id) return null;
    const trip = trips.find(t => t.id === tripId);
    if (!trip?.requests) return null;
    return trip.requests[user.id] || null;
  };
  
  // Get current user's request for a trip (legacy, keeping for backward compatibility)
  const getUserRequest = (trip: Trip): TripRequest | null => {
    if (!user?.id || !trip.requests) return null;
    return trip.requests[user.id] || null;
  };

  // Handle view details for a trip
  const handleViewDetails = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowTripDetails(true);
  };

  // Close the trip details modal
  const handleCloseTripDetails = () => {
    setShowTripDetails(false);
    setSelectedTrip(null);
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

    const existingUserRequest = getRequestStatus(trip.id);
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10 relative overflow-hidden">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-6 sm:pt-28 sm:pb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {isLoading ? (
            <p className="text-center col-span-full py-8">Loading trips...</p>
          ) : filteredTrips.length === 0 ? (
            <Card className="col-span-full">
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
              const isTripFull = trip.availableSeats <= 0;
              
              return (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                  <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-1">
                          {trip.from} → {trip.to}
                        </h3>
                        {isTripFull && (
                          <Badge variant="destructive" className="shrink-0">
                            Full
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          <span>{format(new Date(trip.date), 'MMM d, yyyy')}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{trip.time}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant={isTripFull ? 'destructive' : 'default'} className="shrink-0">
                          {trip.availableSeats} {trip.availableSeats === 1 ? 'seat' : 'seats'} left
                        </Badge>
                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isTripFull ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{trip.creatorName}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {trip.creatorCollege}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Price per person:</span>
                          <span className="font-semibold text-primary">₹{trip.pricePerPerson}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Total cost for {trip.totalSeats} passengers:</span>
                          <span className="font-semibold">₹{trip.pricePerPerson * trip.totalSeats}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-xl">Trip Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-2">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-base flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  Route & Timing
                                </h4>
                                <div className="pl-6 space-y-1">
                                  <p className="font-medium">{trip.from} → {trip.to}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(trip.date), 'EEEE, MMMM d, yyyy')} • {trip.time}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold text-base flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Pricing
                                </h4>
                                <div className="pl-6 space-y-1">
                                  <p>₹{trip.pricePerPerson} <span className="text-sm text-muted-foreground">per person</span></p>
                                  <p className="text-sm">
                                    <span className="text-muted-foreground">Total trip cost:</span>{' '}
                                    <span className="font-medium">₹{trip.totalTripCost}</span>
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold text-base flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Availability
                                </h4>
                                <div className="pl-6">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={isTripFull ? 'destructive' : 'default'} className="shrink-0">
                                      {trip.availableSeats} {trip.availableSeats === 1 ? 'seat' : 'seats'} available
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {trip.totalSeats - trip.availableSeats} of {trip.totalSeats} seats filled
                                    </span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${isTripFull ? 'bg-destructive' : 'bg-primary'}`}
                                      style={{ width: `${((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="font-semibold text-base flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Host Information
                                </h4>
                                <div className="pl-6 space-y-1">
                                  <p className="font-medium">{trip.creatorName}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {trip.creatorCollege}
                                  </Badge>
                                </div>
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
                                onClick={async () => {
                                  if (!user || !user.id) return;
                                  const requestPath = `trips/${trip.id}/requests/${user.id}`;
                                  try {
                                    await remove(ref(database, requestPath));
                                    toast.success("Request removed successfully");
                                    // Optimistic update or rely on onValue for UI changes.
                                  } catch (error) {
                                    console.error("Firebase remove request error: ", error);
                                    toast.error("Failed to remove request.");
                                  }
                                }}
                              >
                                Remove Request
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleRequestToJoin(trip)}
                            disabled={trip.availableSeats === 0}
                          >
                            {trip.availableSeats === 0 ? 'Fully Booked' : 'Request to Join'}
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

      {/* Trip Details Dialog */}
      {selectedTrip && (
        <Dialog open={showTripDetails} onOpenChange={setShowTripDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Trip from {selectedTrip.from} to {selectedTrip.to}
              </DialogTitle>
              <Button
                variant="ghost"
                className="absolute right-4 top-4"
                onClick={handleCloseTripDetails}
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="py-4">
              <TripDetails />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FindTrips;
