
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ref, onValue, update, get, query, orderByChild, equalTo } from "firebase/database";
import { database } from "@/firebase";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { user, isAuthenticated, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    year: "",
  });
  const [privacySettings, setPrivacySettings] = useState({
    showFullName: true,
    showYear: true,
  });
  const [tripStats, setTripStats] = useState({
    created: 0,
    joined: 0
  });

  if (!isAuthenticated || !user) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        year: user.year || "",
      });
      
      if (user.privacySettings) {
        setPrivacySettings(prev => ({
          ...prev,
          ...user.privacySettings
        }));
      }
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      const updates: any = {};
      
      // Update user data in the database
      updates[`users/${user.uid}/name`] = formData.name;
      updates[`users/${user.uid}/phone`] = formData.phone;
      updates[`users/${user.uid}/year`] = formData.year;
      updates[`users/${user.uid}/privacySettings`] = {
        showFullName: privacySettings.showFullName,
        showYear: privacySettings.showYear
      };
      
      // Update all trips where user is the creator
      const tripsRef = ref(database, 'trips');
      const tripsQuery = query(
        tripsRef,
        orderByChild('creatorId'),
        equalTo(user.uid)
      );
      const snapshot = await get(tripsQuery);
      const trips = snapshot.val() || {};
      
      Object.keys(trips).forEach(tripId => {
        updates[`trips/${tripId}/creatorName`] = formData.name;
      });
      
      await update(ref(database), updates);
      
      // Update the auth context
      user.name = formData.name;
      user.phone = formData.phone;
      user.year = formData.year;
      
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyToggle = async (setting: string, value: boolean) => {
    if (!user) return;
    
    const newSettings = {
      ...privacySettings,
      [setting]: value
    };
    
    setPrivacySettings(newSettings);
    
    try {
      await update(ref(database, `users/${user.uid}/privacySettings`), newSettings);
      toast.success("Privacy setting updated!");
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      toast.error("Failed to update privacy settings");
      // Revert on error
      setPrivacySettings(privacySettings);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (passwordError) setPasswordError("");
  };

  const handleResetPassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    
    try {
      setIsSaving(true);
      const result = await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        toast.success(result.message);
        setIsResettingPassword(false);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(result.message);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setPasswordError("An error occurred while resetting your password");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Listen for trips created by the user
    const createdTripsRef = ref(database, 'trips');
    const createdTripsQuery = onValue(createdTripsRef, (snapshot) => {
      const trips = snapshot.val() || {};
      const createdTrips = Object.values(trips).filter(
        (trip: any) => trip.creatorId === user.uid
      ).length;
      
      setTripStats(prev => ({
        ...prev,
        created: createdTrips
      }));
    });

    // Listen for trips the user has joined
    const userTripsRef = ref(database, `user-trips/${user.uid}`);
    const userTripsQuery = onValue(userTripsRef, (snapshot) => {
      const trips = snapshot.val() || {};
      const joinedTrips = Object.keys(trips).length;
      
      setTripStats(prev => ({
        ...prev,
        joined: joinedTrips
      }));
    });

    // Cleanup function
    return () => {
      createdTripsQuery();
      userTripsQuery();
    };
  }, [isAuthenticated, user]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10 relative overflow-hidden">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6 sm:pt-28 sm:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and privacy</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Profile Information</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={isSaving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={isSaving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year">Year of Study</Label>
                          <select
                            id="year"
                            name="year"
                            value={formData.year}
                            onChange={handleInputChange}
                            disabled={isSaving}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select year</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                            <option value="Postgrad">Postgraduate</option>
                            <option value="PhD">PhD</option>
                            <option value="Alumni">Alumni</option>
                          </select>
                        </div>
                        <div className="pt-2">
                          <Button 
                            className="w-full" 
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.profilePicture} />
                    <AvatarFallback className="text-xl bg-primary text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {privacySettings.showFullName ? user.name : 'Anonymous'}
                    </h2>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {user.college} • {privacySettings.showYear ? user.year : 'Year Hidden'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">
                      {user.phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">College</Label>
                    <p className="font-medium capitalize">
                      {user.college || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Year</Label>
                    <p className="font-medium">
                      {privacySettings.showYear ? (user.year || 'Not specified') : 'Hidden'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Safety */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show Full Name</h4>
                    <p className="text-sm text-muted-foreground">
                      Display your complete name on your profile
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.showFullName}
                    onCheckedChange={(checked) => handlePrivacyToggle('showFullName', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show Year of Study</h4>
                    <p className="text-sm text-muted-foreground">
                      Display your current year on your profile
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.showYear}
                    onCheckedChange={(checked) => handlePrivacyToggle('showYear', checked)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Safety Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Contact details shared only after mutual approval</li>
                    <li>• Report inappropriate behavior to moderators</li>
                    <li>• Block users to prevent future interactions</li>
                    <li>• Your phone number is never publicly visible</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{tripStats.created}</div>
                  <p className="text-sm text-muted-foreground">Trips Created</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">{tripStats.joined}</div>
                  <p className="text-sm text-muted-foreground">Trips Joined</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => toast.info("Feature coming soon!")}>
                  Download My Data
                </Button>
                <Dialog open={isResettingPassword} onOpenChange={setIsResettingPassword}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          disabled={isSaving}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          disabled={isSaving}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsResettingPassword(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleResetPassword}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" className="w-full" onClick={() => toast.info("Please contact support")}>
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
