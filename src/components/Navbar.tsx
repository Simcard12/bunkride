
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const isHomePage = location.pathname === '/';

  const NavigationLinks = ({ isMobile = false }) => (
    <>
      <Button 
        variant="ghost" 
        size={isMobile ? 'default' : 'sm'}
        onClick={() => {
          navigate('/dashboard');
          isMobile && setMobileMenuOpen(false);
        }}
        className={`w-full justify-center ${location.pathname === '/dashboard' ? 'bg-accent' : 'hover:bg-accent/50'}`}
      >
        Dashboard
      </Button>
      <Button 
        variant="ghost" 
        size={isMobile ? 'default' : 'sm'}
        onClick={() => {
          navigate('/find-trips');
          isMobile && setMobileMenuOpen(false);
        }}
        className={`w-full justify-center ${location.pathname === '/find-trips' ? 'bg-accent' : 'hover:bg-accent/50'}`}
      >
        Find Trips
      </Button>
      <Button 
        variant="ghost" 
        size={isMobile ? 'default' : 'sm'}
        onClick={() => {
          navigate('/create-trip');
          isMobile && setMobileMenuOpen(false);
        }}
        className={`w-full justify-center ${location.pathname === '/create-trip' ? 'bg-accent' : 'hover:bg-accent/50'}`}
      >
        Create Trip
      </Button>
      {isAuthenticated && (
        <Button 
          variant="ghost" 
          size={isMobile ? 'default' : 'sm'}
          onClick={() => {
            navigate('/profile');
            isMobile && setMobileMenuOpen(false);
          }}
          className={`w-full justify-center ${location.pathname === '/profile' ? 'bg-accent' : 'hover:bg-accent/50'}`}
        >
          Profile
        </Button>
      )}
    </>
  );

  return (
    <nav className="w-full bg-white/90 backdrop-blur-md border-b border-border fixed top-0 left-0 right-0 z-50">
      <div className="w-full max-w-full px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden mr-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle menu</span>
            </Button>
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
            >
              <h1 className="text-2xl sm:text-3xl font-bold italic bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                BunkRide
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {isAuthenticated && (
              <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
                <NavigationLinks />
                <div className="hidden md:flex items-center space-x-2">
                  <div className="text-sm font-medium text-foreground">
                    Welcome, {user?.name.split(' ')[0]}
                  </div>
                </div>
              </div>
            )}
            <Button 
              onClick={() => {
                handleAuthAction();
                setMobileMenuOpen(false);
              }}
              variant={isHomePage ? 'outline' : 'default'}
              size="sm"
              className="px-3 sm:px-4 h-8 sm:h-10 text-xs sm:text-sm"
            >
              {isAuthenticated ? 'Logout' : 'Login'}
            </Button>
          </div>
          
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Menu</h2>
                </div>
                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                  <NavigationLinks isMobile />
                </div>
                {isAuthenticated && (
                  <div className="p-4 border-t">
                    <div className="text-sm font-medium">
                      Welcome, {user?.name?.split(' ')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user?.email}
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
