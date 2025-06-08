
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
import { format } from "date-fns";
import { toast } from "sonner";

interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  availableSeats: number;
  totalSeats: number;
  pricePerPerson: number;
  createdBy: string;
  creatorName: string;
  creatorCollege: string;
  status: 'active' | 'completed' | 'cancelled';
  requests?: Array<{
    id: string;
    userName: string;
    userEmail: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
}

const FindTrips = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [searchDestination, setSearchDestination] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [seatsFilter, setSeatsFilter] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load trips from localStorage or use mock data
    const storedTrips = localStorage.getItem('bunkride_trips');
    let allTrips: Trip[] = [];

    if (storedTrips) {
      allTrips = JSON.parse(storedTrips);
    } else {
      // Mock data for demonstration
      allTrips = [
        {
          id: '1',
          from: 'Patiala',
          to: 'Delhi',
          date: '2024-06-15',
          time: '09:00',
          availableSeats: 3,
          totalSeats: 4,
          pricePerPerson: 800,
          createdBy: 'user2',
          creatorName: 'Priya Singh',
          creatorCollege: 'thapar',
          status: 'active',
          requests: []
        },
        {
          id: '2',
          from: 'Chandigarh',
          to: 'Mumbai',
          date: '2024-06-16',
          time: '06:00',
          availableSeats: 2,
          totalSeats: 4,
          pricePerPerson: 2500,
          createdBy: 'user3',
          creatorName: 'Rohit Kumar',
          creatorCollege: 'chitkara',
          status: 'active',
          requests: []
        },
        {
          id: '3',
          from: 'Jalandhar',
          to: 'Bangalore',
          date: '2024-06-18',
          time: '22:00',
          availableSeats: 1,
          totalSeats: 3,
          pricePerPerson: 3200,
          createdBy: 'user4',
          creatorName: 'Ankit Sharma',
          creatorCollege: 'lpu',
          status: 'active',
          requests: []
        }
      ];
      localStorage.setItem('bunkride_trips', JSON.stringify(allTrips));
    }

    setTrips(allTrips);
    setFilteredTrips(allTrips.filter(trip => trip.status === 'active' && new Date(trip.date) >= new Date()));
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let filtered = trips.filter(trip => 
      trip.status === 'active' && 
      new Date(trip.date) >= new Date() &&
      trip.createdBy !== user?.id
    );

    if (searchDestination) {
      filtered = filtered.filter(trip => 
        trip.to.toLowerCase().includes(searchDestination.toLowerCase()) ||
        trip.from.toLowerCase().includes(searchDestination.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(trip => trip.date === dateFilter);
    }

    if (seatsFilter) {
      const seats = parseInt(seatsFilter);
      filtered = filtered.filter(trip => trip.availableSeats >= seats);
    }

    setFilteredTrips(filtered);
  }, [trips, searchDestination, dateFilter, seatsFilter, user?.id]);

  const handleRequestToJoin = (trip: Trip) => {
    if (!user) return;

    // Check if user already sent a request
    const existingRequest = trip.requests?.find(req => req.userEmail === user.email);
    if (existingRequest) {
      toast.error("You have already sent a request for this trip!");
      return;
    }

    const newRequest = {
      id: Date.now().toString(),
      userName: user.name,
      userEmail: user.email,
      status: 'pending' as const
    };

    // Update the trip with the new request
    const updatedTrips = trips.map(t => {
      if (t.id === trip.id) {
        return {
          ...t,
          requests: [...(t.requests || []), newRequest]
        };
      }
      return t;
    });

    setTrips(updatedTrips);
    localStorage.setItem('bunkride_trips', JSON.stringify(updatedTrips));
    
    toast.success("Request sent! The host will review your request.");
  };

  const getUserRequestStatus = (trip: Trip) => {
    if (!user) return null;
    return trip.requests?.find(req => req.userEmail === user.email);
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
                    <SelectItem value="">Any</SelectItem>
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
        <div className="grid gap-4">
          {filteredTrips.length === 0 ? (
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
              const userRequest = getUserRequestStatus(trip);
              
              return (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          {trip.from} → {trip.to}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span>{format(new Date(trip.date), 'MMM d, yyyy')}</span>
                          <span>{trip.time}</span>
                          <Badge variant="outline">{trip.availableSeats} seats available</Badge>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Host: </span>
                          <span className="font-medium">{trip.creatorName}</span>
                          <Badge variant="secondary" className="ml-2">
                            {trip.creatorCollege}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary mb-2">
                          ₹{trip.pricePerPerson}
                        </div>
                        <div className="text-sm text-muted-foreground">per person</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Total cost: ₹{trip.pricePerPerson * trip.totalSeats} 
                        ({trip.totalSeats} passengers)
                      </div>
                      
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedTrip(trip)}
                            >
                              View Details
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
                                  Total trip cost: ₹{trip.pricePerPerson * trip.totalSeats}
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
                              {userRequest.status === 'pending' ? 'Request Sent' : userRequest.status}
                            </Badge>
                            {userRequest.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // Remove request logic
                                  const updatedTrips = trips.map(t => {
                                    if (t.id === trip.id) {
                                      return {
                                        ...t,
                                        requests: t.requests?.filter(req => req.userEmail !== user.email) || []
                                      };
                                    }
                                    return t;
                                  });
                                  setTrips(updatedTrips);
                                  localStorage.setItem('bunkride_trips', JSON.stringify(updatedTrips));
                                  toast.success("Request removed successfully");
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
    </div>
  );
};

export default FindTrips;
