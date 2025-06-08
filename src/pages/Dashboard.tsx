
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

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
  status: 'active' | 'completed' | 'cancelled';
  requests?: Array<{
    id: string;
    userName: string;
    userEmail: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
}

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load trips from localStorage
    const storedTrips = localStorage.getItem('bunkride_trips');
    const storedMyTrips = localStorage.getItem('bunkride_my_trips');
    
    if (storedTrips) {
      setTrips(JSON.parse(storedTrips));
    }
    
    if (storedMyTrips) {
      setMyTrips(JSON.parse(storedMyTrips));
    }
  }, [isAuthenticated, navigate]);

  const handleManageRequests = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  const handleRequestAction = (tripId: string, requestId: string, action: 'approve' | 'reject') => {
    setMyTrips(prevTrips => 
      prevTrips.map(trip => {
        if (trip.id === tripId) {
          const updatedTrip = {
            ...trip,
            requests: trip.requests?.map(req => 
              req.id === requestId ? { ...req, status: action === 'approve' ? 'approved' as const : 'rejected' as const } : req
            )
          };
          
          if (action === 'approve') {
            updatedTrip.availableSeats = Math.max(0, updatedTrip.availableSeats - 1);
          }
          
          return updatedTrip;
        }
        return trip;
      })
    );
    
    // Update localStorage
    const updatedMyTrips = myTrips.map(trip => {
      if (trip.id === tripId) {
        const updatedTrip = {
          ...trip,
          requests: trip.requests?.map(req => 
            req.id === requestId ? { ...req, status: action === 'approve' ? 'approved' as const : 'rejected' as const } : req
          )
        };
        
        if (action === 'approve') {
          updatedTrip.availableSeats = Math.max(0, updatedTrip.availableSeats - 1);
        }
        
        return updatedTrip;
      }
      return trip;
    });
    
    localStorage.setItem('bunkride_my_trips', JSON.stringify(updatedMyTrips));
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
                            >
                              Manage Requests
                              {trip.requests?.filter(r => r.status === 'pending').length ? (
                                <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                                  {trip.requests.filter(r => r.status === 'pending').length}
                                </Badge>
                              ) : null}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage Trip Requests</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {trip.requests?.length === 0 || !trip.requests ? (
                                <p className="text-muted-foreground">No requests yet</p>
                              ) : (
                                trip.requests.map((request) => (
                                  <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                                    <div>
                                      <p className="font-medium">{request.userName}</p>
                                      <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      {request.status === 'pending' ? (
                                        <>
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleRequestAction(trip.id, request.id, 'approve')}
                                          >
                                            Approve
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleRequestAction(trip.id, request.id, 'reject')}
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
