
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
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

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center cursor-pointer gap-3 hover:opacity-80 transition-opacity" 
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          >
            <img 
              src="/images/Your paragraph text.png" 
              alt="BunkRide Logo" 
              className="h-9 w-9 object-contain"
            />
            <div className="text-2xl font-bold text-primary">BunkRide</div>
          </div>

          <div className="flex items-center space-x-6">
            {isAuthenticated && (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/dashboard')}
                  className={`px-4 h-10 ${location.pathname === '/dashboard' ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/find-trips')}
                  className={`px-4 h-10 ${location.pathname === '/find-trips' ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  Find Trips
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/create-trip')}
                  className={`px-4 h-10 ${location.pathname === '/create-trip' ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  Create Trip
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/profile')}
                  className={`px-4 h-10 ${location.pathname === '/profile' ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  Profile
                </Button>
                <div className="text-sm text-muted-foreground">
                  Welcome, {user?.name.split(' ')[0]}
                </div>
              </>
            )}
            
            <Button 
              onClick={handleAuthAction}
              className={`px-6 h-10 ${isAuthenticated ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
            >
              {isAuthenticated ? 'Sign Out' : 'Login'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
