
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          >
            <div className="text-2xl font-bold text-primary">BunkRide</div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/dashboard')}
                  className={location.pathname === '/dashboard' ? 'bg-accent' : ''}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/find-trips')}
                  className={location.pathname === '/find-trips' ? 'bg-accent' : ''}
                >
                  Find Trips
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/create-trip')}
                  className={location.pathname === '/create-trip' ? 'bg-accent' : ''}
                >
                  Create Trip
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/profile')}
                  className={location.pathname === '/profile' ? 'bg-accent' : ''}
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
              className={isAuthenticated ? 'bg-destructive hover:bg-destructive/90' : ''}
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
