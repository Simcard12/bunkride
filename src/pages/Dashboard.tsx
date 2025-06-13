import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ref, query, orderByChild, equalTo, onValue, get, update, getDatabase, child, set, push, remove } from "firebase/database";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { database } from "@/firebase";

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
  isCostDoubtful?: boolean;
  creatorId: string;
  creatorName: string;
  creatorPhone?: string;
  creatorCollege: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  requests?: { [userId: string]: Omit<TripRequest, 'userId'> & { phone?: string } };
}

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: {name: string; phone: string}}>({});
  const [tripContacts, setTripContacts] = useState<{[tripId: string]: Array<{name: string; phone: string; isCreator: boolean}> | null}>({});

  // Function to check and clean up past trips
  const cleanupPastTrips = async (tripsData: {[key: string]: Trip}) => {
    const now = new Date();
    const db = getDatabase();
    const updates: {[key: string]: null} = {};
    
    for (const [tripId, trip] of Object.entries(tripsData)) {
      const tripDate = new Date(`${trip.date}T${trip.time}`);
      
      // If trip date has passed, mark for deletion
      if (tripDate < now) {
        updates[`/trips/${tripId}`] = null;
        
        // Also clean up any related requests
        if (trip.requests) {
          for (const userId of Object.keys(trip.requests)) {
            updates[`/user-trips/${userId}/${tripId}`] = null;
          }
        }
      }
    }
    
    // Perform all deletions in a single transaction
    if (Object.keys(updates).length > 0) {
      try {
        await update(ref(db), updates);
        console.log('Cleaned up past trips');
      } catch (error) {
        console.error('Error cleaning up past trips:', error);
      }
    }
  };

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
    const unsubscribeAllTrips = onValue(allTripsRef, async (snapshot) => {
      const data = snapshot.val();
      
      // Clean up past trips before setting state
      if (data) {
        await cleanupPastTrips(data);
      }
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

  const handleRequestToJoin = async (trip: Trip) => {
    if (!user || !user.id || !user.name || !user.email) {
      toast.error("User information is missing. Please re-login.");
      navigate('/login');
      return;
    }
    
    // Prevent users from sending requests to their own trips
    if (trip.creatorId === user.id) {
      toast.error("You can't request to join your own trip!");
      return;
    }

    if (trip.availableSeats <= 0) {
      toast.info("This trip is fully booked.");
      return;
    }

    // Check if user already has a request for this trip
    const existingRequest = trip.requests && trip.requests[user.id];
    if (existingRequest) {
      toast.info(`You have already sent a '${existingRequest.status}' request for this trip.`);
      return;
    }

    const requestPath = `trips/${trip.id}/requests/${user.id}`;
    const newRequestData = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email, 
      status: 'pending' as const,
      requestedAt: Date.now() // Using Date.now() instead of serverTimestamp for type safety
    };

    try {
      await set(ref(database, requestPath), newRequestData);
      toast.success("Request sent successfully!");
      
      // Update local state to reflect the new request
      setTrips(prevTrips => 
        prevTrips.map(t => {
          if (t.id === trip.id) {
            return {
              ...t,
              requests: {
                ...t.requests,
                [user.id]: newRequestData
              }
            };
          }
          return t;
        })
      );
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send request. Please try again.");
    }
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
      
      // Show success message to the trip creator
      if (action === 'approve') {
        toast.success(`Request approved! ${tripData.requests?.[userId]?.userName || 'The user'} has been added to your trip.`);
        
        // Create a notification for the requester
        const notificationRef = ref(database, `notifications/${userId}`);
        const newNotification = {
          type: 'trip_approved',
          tripId: tripId,
          tripFrom: tripData.from,
          tripTo: tripData.to,
          tripDate: tripData.date,
          message: '🎉 Your trip request has been approved! 🎉',
          read: false,
          createdAt: Date.now(),
          createdBy: user.id,
          createdByName: user.name
        };
        
        // Push the new notification to the database
        const newNotificationRef = push(notificationRef);
        await set(newNotificationRef, newNotification);
      } else {
        toast.success('Request rejected');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(`Failed to ${action} request`);
    }
  };

  // Check if a trip can be deleted (within 48 hours of departure)
  const canDeleteTrip = (trip: Trip) => {
    const now = new Date();
    const tripDate = new Date(trip.date);
    // Calculate the difference in hours
    const hoursUntilTrip = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilTrip > 48;
  };

  // Handle trip deletion
  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return;
    }

    try {
      const tripRef = ref(database, `trips/${tripId}`);
      await remove(tripRef);
      toast.success('Trip deleted successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  // Filter and sort upcoming trips
  const upcomingTrips = useMemo(() => {
    if (!user) return [];

    return trips.filter(trip => {
      const tripDate = new Date(trip.date);
      return tripDate >= new Date() && 
             trip.status === 'active' && 
             trip.availableSeats > 0; // Only include trips with available seats
    }).sort((a, b) => {
      // Priority 1: Trips created by user
      const isACreator = a.creatorId === user.id;
      const isBCreator = b.creatorId === user.id;
      
      if (isACreator && !isBCreator) return -1;
      if (!isACreator && isBCreator) return 1;

      // Priority 2: Trips where user is approved
      const isAApproved = a.requests?.[user.id]?.status === 'approved';
      const isBApproved = b.requests?.[user.id]?.status === 'approved';
      
      if (isAApproved && !isBApproved) return -1;
      if (!isAApproved && isBApproved) return 1;

      // Priority 3: Trips where user has sent request
      const hasARequest = a.requests?.[user.id];
      const hasBRequest = b.requests?.[user.id];
      
      if (hasARequest && !hasBRequest) return -1;
      if (!hasARequest && hasBRequest) return 1;

      // Finally sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [trips, user]);

  // Format price for display
  const formatPrice = (trip: Trip) => {
    if (trip.isCostDoubtful) return 'Cost to be discussed';
    return `₹${trip.pricePerPerson} per person`;
  };

  // Function to fetch user profile by ID
  const fetchUserProfile = async (userId: string) => {
    if (userProfiles[userId]) return userProfiles[userId];
    
    try {
      const dbRef = ref(getDatabase());
      const snapshot = await get(child(dbRef, `users/${userId}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const profile = {
          name: userData.name,
          phone: userData.phone
        };
        setUserProfiles(prev => ({
          ...prev,
          [userId]: profile
        }));
        return profile;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  };

  // Update contact info when trips or userProfiles change
  useEffect(() => {
    const updateContactInfo = async () => {
      if (!user) return;
      
      console.log('Updating contact info...');
      const newContacts: {[key: string]: any} = {};
      
      for (const trip of upcomingTrips) {
        console.log('Processing trip:', trip.id, 'Creator:', trip.creatorId, 'Current user:', user.id);
        const approvedRequests = [];
        const isUserCreator = trip.creatorId === user.id;
        
        // Only show contacts if the current user is part of the trip (creator or approved participant)
        const tripRequests = trip.requests || {};
        console.log('Trip requests:', tripRequests);
        
        const isUserApprovedParticipant = Object.entries(tripRequests)
          .some(([userId, req]) => {
            const isApproved = userId === user.id && req.status === 'approved';
            console.log(`Checking user ${userId} (${req.userName}):`, { status: req.status, isApproved });
            return isApproved;
          });
          
        console.log('Is user creator?', isUserCreator);
        console.log('Is user approved participant?', isUserApprovedParticipant);
        
        if (!isUserCreator && !isUserApprovedParticipant) {
          console.log('User is not part of this trip, skipping...');
          newContacts[trip.id] = null;
          continue;
        }

        console.log('Gathering contact info for trip:', trip.id);
        // Add other participants (excluding current user)
        if (isUserCreator) {
          // If current user is creator, show all approved participants
          const requests = trip.requests || {};
          for (const [userId, req] of Object.entries(requests)) {
            if (req.status === 'approved' && userId !== user.id) {
              const userProfile = await fetchUserProfile(userId);
              if (userProfile) {
                approvedRequests.push({
                  name: userProfile.name,
                  phone: userProfile.phone || 'No phone provided',
                  isCreator: false
                });
              }
            }
          }
        } else {
          // If current user is a participant, show creator and other participants
          // Show creator
          const creatorProfile = await fetchUserProfile(trip.creatorId);
          if (creatorProfile) {
            approvedRequests.push({
              name: creatorProfile.name,
              phone: creatorProfile.phone || 'No phone provided',
              isCreator: true
            });
          }
          
          // Show other approved participants (excluding self)
          const requests = trip.requests || {};
          for (const [userId, req] of Object.entries(requests)) {
            if (req.status === 'approved' && userId !== user.id) {
              const userProfile = await fetchUserProfile(userId);
              if (userProfile) {
                approvedRequests.push({
                  name: userProfile.name,
                  phone: userProfile.phone || 'No phone provided',
                  isCreator: false
                });
              }
            }
          }
        }
        
        console.log(`Found ${approvedRequests.length} contacts for trip ${trip.id}:`, approvedRequests);
        newContacts[trip.id] = approvedRequests.length > 0 ? approvedRequests : null;
      }
      
      setTripContacts(prev => ({
        ...prev,
        ...newContacts
      }));
    };
    
    if (user) {
      updateContactInfo();
    }
  }, [upcomingTrips, user, userProfiles]);
  
  const getContactInfo = (tripId: string) => {
    return tripContacts[tripId] || null;
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Debug: Log the final tripContacts state
  useEffect(() => {
    console.log('Current tripContacts:', tripContacts);
  }, [tripContacts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10 relative overflow-hidden">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6 sm:pt-28 sm:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">Manage your trips and find new travel companions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
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
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors w-full"
                    >
                      <div>
                        <div 
                          className="cursor-pointer"
                          onClick={() => navigate(`/trip/${trip.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{trip.from} → {trip.to}</h3>
                            <Badge variant={trip.isCostDoubtful ? 'outline' : 'default'}>
                              {formatPrice(trip)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(trip.date), 'MMM d, yyyy')} at {trip.time}
                          </div>
                          <div className="text-sm mt-1">
                            {trip.availableSeats} seats available
                          </div>
                        </div>
                        
                        {/* Request to Join Button */}
                        {trip.creatorId !== user?.id && (
                          <div className="mt-3 flex justify-end">
                            {trip.requests && trip.requests[user?.id || ''] ? (
                              <Badge variant="outline" className="mt-1">
                                Request {trip.requests[user.id].status}
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestToJoin(trip);
                                }}
                                disabled={trip.availableSeats <= 0}
                              >
                                {trip.availableSeats > 0 ? 'Request to Join' : 'No Seats Available'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {getContactInfo(trip.id) && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="text-sm font-medium mb-2">Contact Information:</h4>
                          <div className="space-y-2">
                            {getContactInfo(trip.id)?.map((person, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="font-medium">
                                  {person.name} {person.isCreator && '(Host)'}
                                </span>
                                <a 
                                  href={`tel:${person.phone}`}
                                  className="text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {person.phone}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                        <div className="text-sm">
                          {trip.availableSeats}/{trip.totalSeats} seats available
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                                    {Object.values(trip.requests).filter((r: any) => r.status === 'pending').length}
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
                                  Object.entries(trip.requests).map(([userId, request]: [string, any]) => (
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
                          
                          {canDeleteTrip(trip) && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTrip(trip.id);
                              }}
                            >
                              Delete Trip
                            </Button>
                          )}
                        </div>
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
