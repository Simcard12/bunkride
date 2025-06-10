import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ref, query, orderByChild, equalTo, onValue, get, update, getDatabase } from "firebase/database";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface TripRequest {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
}

interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  vehicleMode: string;
  availableSeats: number;
  totalSeats: number;
  pricePerPerson: number;
  totalTripCost: number;
  creatorId: string;
  creatorName: string;
  creatorCollege: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number; // Assuming serverTimestamp resolves to a number
  requests?: { [userId: string]: Omit<TripRequest, 'userId'> };
}

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      setTrips([]);
      setMyTrips([]);
      localStorage.removeItem('bunkride_trips');
      localStorage.removeItem('bunkride_my_trips');
      return;
    }

    const database = getDatabase();
    
    // Fetch all trips for 'Upcoming Trips'
    const allTripsRef = ref(database, 'trips');
    const unsubscribeAllTrips = onValue(allTripsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTrips: Trip[] = [];
      if (data) {
        for (const key in data) {
          loadedTrips.push({ id: key, ...data[key] });
        }
        setTrips(loadedTrips);
        localStorage.setItem('bunkride_trips', JSON.stringify(loadedTrips));
      } else {
        setTrips([]);
        localStorage.removeItem('bunkride_trips');
      }
    });

    // Fetch user's created trips for 'My Created Trips'
    const myTripsQuery = query(ref(database, 'trips'), orderByChild('creatorId'), equalTo(user.id));
    const unsubscribeMyTrips = onValue(myTripsQuery, (snapshot) => {
      const data = snapshot.val();
      const loadedMyTrips: Trip[] = [];
      if (data) {
        for (const key in data) {
          loadedMyTrips.push({ id: key, ...data[key] });
        }
        setMyTrips(loadedMyTrips);
        localStorage.setItem('bunkride_my_trips', JSON.stringify(loadedMyTrips));
      } else {
        setMyTrips([]);
        localStorage.removeItem('bunkride_my_trips');
      }
    });

    // Cleanup listeners on component unmount
    return () => {
      unsubscribeAllTrips();
      unsubscribeMyTrips();
    };
  }, [isAuthenticated, user, navigate]);

  const handleManageRequests = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  const handleRequestAction = async (tripId: string, userId: string, action: 'approve' | 'reject') => {
    try {
      const database = getDatabase();
      const db = database;
      const tripRef = ref(db, `trips/${tripId}`);
      const requestRef = ref(db, `trips/${tripId}/requests/${userId}`);
      
      // Get current trip data
      const snapshot = await get(tripRef);
      const tripData = snapshot.val();
      
      if (!tripData) {
        console.error('Trip not found');
        return;
      }
      
      // Update request status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await update(requestRef, { status: newStatus });
      
      // If approving, update available seats
      if (action === 'approve') {
        const newAvailableSeats = Math.max(0, (tripData.availableSeats || tripData.totalSeats) - 1);
        await update(tripRef, { availableSeats: newAvailableSeats });
      }
      
      // Update local state
      setMyTrips(prevTrips => 
        prevTrips.map(trip => {
          if (trip.id === tripId) {
            const updatedRequests = { ...(trip.requests || {}) };
            if (updatedRequests[userId]) {
              updatedRequests[userId] = {
                ...updatedRequests[userId],
                status: newStatus
              };
              
              const updatedTrip = {
                ...trip,
                requests: updatedRequests,
                availableSeats: action === 'approve' 
                  ? Math.max(0, trip.availableSeats - 1) 
                  : trip.availableSeats
              };
              
              return updatedTrip;
            }
          }
          return trip;
        })
      );
      
      // Update localStorage
      const updatedMyTrips = myTrips.map(trip => {
        if (trip.id === tripId) {
          const updatedRequests = { ...(trip.requests || {}) };
          if (updatedRequests[userId]) {
            updatedRequests[userId] = {
              ...updatedRequests[userId],
              status: newStatus
            };
            
            const updatedTrip = {
              ...trip,
              requests: updatedRequests,
              availableSeats: action === 'approve' 
                ? Math.max(0, trip.availableSeats - 1) 
                : trip.availableSeats
            };
            
            return updatedTrip;
          }
        }
        return trip;
      });
      
      localStorage.setItem('bunkride_my_trips', JSON.stringify(updatedMyTrips));
      
      // Show success message with celebration for approved requests
      if (action === 'approve') {
        toast.success(
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold">🎉 Congratulations! 🎉</span>
            <span>Your BunkRide has been approved!</span>
            <span className="text-sm text-muted-foreground">Get ready for your trip!</span>
          </div>,
          {
            duration: 5000,
            className: 'bg-green-50 border-green-200',
          }
        );
      } else {
        toast.success(`Request rejected successfully`);
      }
      
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(`Failed to ${action} request`);
    }
  };

  const upcomingTrips = trips.filter(trip => new Date(trip.date) >= new Date() && trip.status === 'active');

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">Manage your trips and find new travel companions</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upcoming Trips</span>
                <Badge variant="secondary">{upcomingTrips.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTrips.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No upcoming trips</p>
                  <Button onClick={() => navigate('/find-trips')}>
                    Find Trips
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingTrips.slice(0, 3).map((trip) => (
                    <div 
                      key={trip.id} 
                      className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/trip/${trip.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{trip.from} → {trip.to}</h3>
                        <Badge>₹{trip.pricePerPerson}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(trip.date), 'MMM d, yyyy')} at {trip.time}
                      </div>
                      <div className="text-sm mt-1">
                        {trip.availableSeats} seats available
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Created Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>My Created Trips</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">{myTrips.length}</Badge>
                  <Button size="sm" onClick={() => navigate('/create-trip')}>
                    Create Trip
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myTrips.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No trips created yet</p>
                  <Button onClick={() => navigate('/create-trip')}>
                    Create Your First Trip
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myTrips.map((trip) => (
                    <div key={trip.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{trip.from} → {trip.to}</h3>
                        <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {format(new Date(trip.date), 'MMM d, yyyy')} at {trip.time}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          {trip.availableSeats}/{trip.totalSeats} seats available
                        </span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleManageRequests(trip)}
                              className="flex items-center gap-1.5"
                            >
                              <span>Manage Requests</span>
                              {trip.requests ? (
                                <Badge className="h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs">
                                  {Object.values(trip.requests).filter(r => r.status === 'pending').length}
                                </Badge>
                              ) : null}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage Trip Requests</DialogTitle>
                              <DialogDescription>
                                Review and approve or reject requests for this trip.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {!trip.requests || Object.keys(trip.requests).length === 0 ? (
                                <p className="text-muted-foreground">No requests yet</p>
                              ) : (
                                Object.entries(trip.requests).map(([userId, request]) => (
                                  <div key={userId} className="flex items-center justify-between p-3 border rounded">
                                    <div>
                                      <p className="font-medium">{request.userName || 'Unknown User'}</p>
                                      <p className="text-sm text-muted-foreground">{request.userEmail || 'No email provided'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      {request.status === 'pending' ? (
                                        <>
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleRequestAction(trip.id, userId, 'approve')}
                                          >
                                            Approve
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleRequestAction(trip.id, userId, 'reject')}
                                          >
                                            Reject
                                          </Button>
                                        </>
                                      ) : (
                                        <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                                          {request.status}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/find-trips')}>
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-semibold mb-1">Find Trips</h3>
            <p className="text-sm text-muted-foreground">Browse available rides</p>
          </Card>
          
          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/create-trip')}>
            <div className="text-2xl mb-2">➕</div>
            <h3 className="font-semibold mb-1">Create Trip</h3>
            <p className="text-sm text-muted-foreground">Start a new ride</p>
          </Card>
          
          <Card className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/profile')}>
            <div className="text-2xl mb-2">👤</div>
            <h3 className="font-semibold mb-1">Profile</h3>
            <p className="text-sm text-muted-foreground">Manage your account</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
