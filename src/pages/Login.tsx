
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    year: "",
    // college: "" // College is now derived from email in AuthContext
  });
  
  // Destructure new items from useAuth
  const { login, signup, isLoading, firebaseUser, sendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      const success = await login(formData.email, formData.password);
      if (success) {
        // AuthContext now handles email verification check before setting isAuthenticated
        // If login returns true, email is verified and user profile is loaded.
        toast.success("Login successful!");
        navigate("/dashboard");
      } else {
        // Error toast is handled by AuthContext, but you can add specific UI updates here if needed
        // For example, if firebaseUser exists but email is not verified, prompt to resend.
        if (firebaseUser && !firebaseUser.emailVerified) {
            toast.info("Your email is not verified. Please check your inbox or resend the verification email.");
        } else {
            // General invalid credentials message is handled by AuthContext
        }
      }
    } else { // Signup
      // .edu check is now in AuthContext's signup function.
      
      const signupData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        year: formData.year,
      };
      
      const success = await signup(signupData);
      if (success) {
        // Success means signup process initiated, verification email sent.
        // User is not yet fully authenticated for app access.
        toast.success("Account created! Please check your email to verify your account.");
        setIsLogin(true); // Switch to login form so they can login after verification
      } else {
        // Error toast is handled by AuthContext
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResendVerification = async () => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      try {
        await sendVerificationEmail();
      } catch (error) {
        // Error toast is handled by sendVerificationEmail in AuthContext
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/20 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {isLogin ? "Welcome Back" : "Join BunkRide"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="year">Year of Study</Label>
                  <Select 
                    value={formData.year} 
                    onValueChange={(value) => handleInputChange('year', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First Year</SelectItem>
                      <SelectItem value="second">Second Year</SelectItem>
                      <SelectItem value="third">Third Year</SelectItem>
                      <SelectItem value="final">Final Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">College Email (.edu only)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.name@college.edu"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (isLogin ? "Signing In..." : "Creating Account...") : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          {isLogin && firebaseUser && !firebaseUser.emailVerified && (
            <div className="mt-4 text-center">
              <p className="text-sm text-orange-600">Your email is not verified.</p>
              <Button
                variant="link"
                onClick={handleResendVerification}
                disabled={isLoading}
                className="text-sm"
              >
                {isLoading ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          )}
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
