
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    showFullName: true,
    showDepartment: true,
    showYear: true,
  });

  if (!isAuthenticated || !user) {
    navigate('/login');
    return null;
  }

  const handleEditProfile = () => {
    setIsEditing(true);
    toast.info("Profile editing will be available in the next update!");
  };

  const handlePrivacyToggle = (setting: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }));
    toast.success("Privacy setting updated!");
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and privacy</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Profile Information</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={handleEditProfile}>
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Full Name</Label>
                          <Input id="edit-name" defaultValue={user.name} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-phone">Phone Number</Label>
                          <Input id="edit-phone" defaultValue={user.phone} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-year">Year</Label>
                          <Input id="edit-year" defaultValue={user.year} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-department">Department</Label>
                          <Input id="edit-department" defaultValue={user.department} />
                        </div>
                        <Button className="w-full" onClick={() => toast.info("Save functionality coming soon!")}>
                          Save Changes
                        </Button>
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
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {user.college} • {user.year} • {user.department}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">College</Label>
                    <p className="font-medium capitalize">{user.college}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Year</Label>
                    <p className="font-medium">{user.year}</p>
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
                    <h4 className="font-medium">Show Department</h4>
                    <p className="text-sm text-muted-foreground">
                      Display your department on your profile
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.showDepartment}
                    onCheckedChange={(checked) => handlePrivacyToggle('showDepartment', checked)}
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
                  <div className="text-3xl font-bold text-primary">5</div>
                  <p className="text-sm text-muted-foreground">Trips Created</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">12</div>
                  <p className="text-sm text-muted-foreground">Trips Joined</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">4.8</div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
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
                <Button variant="outline" className="w-full" onClick={() => toast.info("Feature coming soon!")}>
                  Change Password
                </Button>
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
