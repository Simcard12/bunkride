
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  college: string;
  phone: string;
  profilePicture?: string;
  year?: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: any) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('bunkride_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication
    const mockUser: User = {
      id: '1',
      name: 'Arjun Sharma',
      email: email,
      college: email.split('@')[1].split('.')[0],
      phone: '+91 98765 43210',
      year: 'Final Year',
      department: 'Computer Science'
    };

    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('bunkride_user', JSON.stringify(mockUser));
    return true;
  };

  const signup = async (userData: any): Promise<boolean> => {
    const newUser: User = {
      id: Date.now().toString(),
      ...userData
    };

    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('bunkride_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('bunkride_user');
    localStorage.removeItem('bunkride_trips');
    localStorage.removeItem('bunkride_my_trips');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
