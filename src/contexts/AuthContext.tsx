
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User as FirebaseUser, // Alias Firebase User type
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';
import { auth, database } from '../firebase'; // Corrected path
import { toast } from 'sonner'; // For notifications

// Your application's User profile structure
interface AppUser {
  id: string; // Firebase UID
  uid: string; // Alias for id to match Firebase User
  name: string;
  displayName: string; // Alias for name to match Firebase User
  email: string;
  college: string; // e.g., "thapar" from "user@thapar.edu"
  phone: string;
  profilePicture?: string;
  photoURL?: string; // Alias for profilePicture to match Firebase User
  year?: string;
}

// Data expected by the signup function
interface SignupData {
  name: string;
  email: string;
  password: string;
  phone: string;
  year?: string;
  // college field from form is not used here, it's derived from email
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null; // Store the raw Firebase user object if needed
  isAuthenticated: boolean;
  isLoading: boolean; // To handle async state loading
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  sendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      if (currentFirebaseUser && currentFirebaseUser.emailVerified) {
        // User is logged in and email is verified, fetch their profile from RTDB
        try {
          const userProfileRef = ref(database, `users/${currentFirebaseUser.uid}`);
          const snapshot = await get(userProfileRef);
          if (snapshot.exists()) {
            setUser({ ...snapshot.val(), id: currentFirebaseUser.uid } as AppUser);
            setFirebaseUser(currentFirebaseUser);
            setIsAuthenticated(true);
          } else {
            // Profile doesn't exist, might be an issue or first login after verification
            toast.error('User profile not found. Please contact support or try logging in again.');
            await signOut(auth); // Log them out from Firebase
            setUser(null);
            setFirebaseUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          toast.error('Failed to load user profile.');
          await signOut(auth);
          setUser(null);
          setFirebaseUser(null);
          setIsAuthenticated(false);
        }
      } else if (currentFirebaseUser && !currentFirebaseUser.emailVerified) {
        // User is logged in but email is not verified
        // toast.info('Please verify your email address to continue.'); // This might be too noisy on every load
        setUser(null); 
        setFirebaseUser(currentFirebaseUser); // Keep firebase user to allow re-sending verification
        setIsAuthenticated(false);
      } else {
        // No user is logged in
        setUser(null);
        setFirebaseUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch the user's data from the database
      const userSnapshot = await get(child(ref(database), `users/${firebaseUser.uid}`));
      
      if (!userSnapshot.exists()) {
        toast.error('No user data found. Please sign up again.');
        await signOut(auth);
        return false;
      }

      const userData = userSnapshot.val();
      setUser({ 
        id: firebaseUser.uid, 
        uid: firebaseUser.uid,
        name: userData.name,
        displayName: userData.name,
        email: userData.email,
        college: userData.college,
        phone: userData.phone,
        profilePicture: userData.profilePicture,
        photoURL: userData.profilePicture,
        year: userData.year
      });
      setFirebaseUser(firebaseUser);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to log in. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData): Promise<boolean> => {
    setIsLoading(true);
    if (!userData.email.endsWith('.edu')) {
      toast.error('Only .edu email addresses are allowed for signup.');
      setIsLoading(false);
      return false;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const fbUser = userCredential.user;

      await sendEmailVerification(fbUser);
      toast.success('Registration successful! Please check your email to verify your account.');

      const emailParts = userData.email.split('@');
      const domainParts = emailParts.length > 1 ? emailParts[1].split('.') : [];
      const collegeName = domainParts.length > 0 ? domainParts[0] : 'unknown';

      const userProfile: Omit<AppUser, 'id'> = {
        uid: userCredential.user.uid,
        name: userData.name,
        displayName: userData.name,
        email: userData.email,
        college: collegeName,
        phone: userData.phone,
        photoURL: '',
        year: userData.year,
      };

      await set(ref(database, `users/${fbUser.uid}`), userProfile);
      
      // User will be signed in by createUserWithEmailAndPassword, but email is not verified.
      // onAuthStateChanged will set firebaseUser, but isAuthenticated will be false.
      setIsLoading(false);
      return true; // Indicates signup process initiated, verification needed
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please login or use a different email.');
      } else {
        toast.error(error.message || 'Signup failed. Please try again.');
      }
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will clear user, firebaseUser, and isAuthenticated
    } catch (error: any) {
      console.error("Logout error: ", error);
      toast.error('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendVerificationEmail = async (): Promise<void> => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      try {
        await sendEmailVerification(firebaseUser);
        toast.success('Verification email sent! Please check your inbox.');
      } catch (error: any) {
        console.error("Error sending verification email:", error);
        toast.error('Failed to send verification email. Please try again.');
        throw error; 
      }
    } else if (firebaseUser && firebaseUser.emailVerified) {
      toast.info('Your email is already verified.');
    } else {
      toast.error('No user session found to send verification email. Please log in again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isAuthenticated, isLoading, login, signup, logout, sendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
};
