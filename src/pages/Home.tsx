
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
            Smart Travel Coordination
            <br />
            <span className="text-4xl md:text-5xl">for Students</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Replace chaotic WhatsApp groups with organized trip planning. 
            Connect safely with verified students from your institution for intercity rides.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
              onClick={() => navigate('/login')}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary/10"
              onClick={() => navigate('/find-trips')}
            >
              Browse Trips
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">
            Why Students Choose BunkRide
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center border-primary/20 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary">Student-Only Platform</h3>
              <p className="text-muted-foreground">
                Verified college email authentication ensures you're only connecting with genuine students.
              </p>
            </Card>

            <Card className="p-6 text-center border-secondary/20 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-secondary">Privacy First</h3>
              <p className="text-muted-foreground">
                Contact details shared only after mutual approval. No unwanted exposure or spam.
              </p>
            </Card>

            <Card className="p-6 text-center border-accent/20 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary">Smart Coordination</h3>
              <p className="text-muted-foreground">
                Automatic fare splitting, trip reminders, and organized request management.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12 text-primary">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Sign Up</h3>
              <p className="text-sm text-muted-foreground">Verify with your college email</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Find or Create</h3>
              <p className="text-sm text-muted-foreground">Browse trips or create your own</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Send Request</h3>
              <p className="text-sm text-muted-foreground">Request to join or approve joiners</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-success text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Connect & Travel</h3>
              <p className="text-sm text-muted-foreground">Share contacts and coordinate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-bold mb-4">BunkRide</div>
          <p className="text-primary-foreground/80 mb-4">
            Empowering students to travel together, smarter.
          </p>
          <div className="text-sm text-primary-foreground/60">
            © 2024 BunkRide. Made for students, by students.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
