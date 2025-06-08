
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Bus, TrainFront, TramFront, Bike } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CreateTrip = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: '',
    time: '',
    vehicleMode: 'car',
    totalSeats: 2,
    totalCost: 1000
  });

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculatePricePerPerson = () => {
    return Math.round(formData.totalCost / formData.totalSeats);
  };

  const getVehicleIcon = (mode: string) => {
    switch (mode) {
      case 'car': return Car;
      case 'bus': return Bus;
      case 'train': return TrainFront;
      case 'metro': return TramFront;
      case 'bike': return Bike;
      default: return Car;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newTrip = {
        id: Date.now().toString(),
        from: formData.from,
        to: formData.to,
        date: formData.date,
        time: formData.time,
        vehicleMode: formData.vehicleMode,
        availableSeats: formData.totalSeats,
        totalSeats: formData.totalSeats,
        pricePerPerson: calculatePricePerPerson(),
        createdBy: user?.id || '1',
        creatorName: user?.name || 'Unknown',
        creatorCollege: user?.college || 'unknown',
        status: 'active' as const,
        requests: []
      };

      // Save to trips list
      const existingTrips = JSON.parse(localStorage.getItem('bunkride_trips') || '[]');
      existingTrips.push(newTrip);
      localStorage.setItem('bunkride_trips', JSON.stringify(existingTrips));

      // Save to my trips
      const existingMyTrips = JSON.parse(localStorage.getItem('bunkride_my_trips') || '[]');
      existingMyTrips.push(newTrip);
      localStorage.setItem('bunkride_my_trips', JSON.stringify(existingMyTrips));

      // Show success notification
      toast.success(
        "🎉 Trip Created Successfully!", 
        {
          description: "Your trip is now live and visible to other students. You can manage requests from your dashboard.",
          duration: 5000,
        }
      );

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      toast.error("Failed to create trip. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Create a Trip</h1>
          <p className="text-muted-foreground">Share your ride and connect with fellow students</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Route Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="text"
                    placeholder="Departure city"
                    value={formData.from}
                    onChange={(e) => handleInputChange('from', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="text"
                    placeholder="Destination city"
                    value={formData.to}
                    onChange={(e) => handleInputChange('to', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Departure Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Vehicle Mode */}
              <div className="space-y-2">
                <Label htmlFor="vehicle">Mode of Transport</Label>
                <Select 
                  value={formData.vehicleMode} 
                  onValueChange={(value) => handleInputChange('vehicleMode', value)}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      {React.createElement(getVehicleIcon(formData.vehicleMode), { size: 18 })}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">
                      <div className="flex items-center gap-2">
                        <Car size={16} />
                        <span>Car/Taxi</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bus">
                      <div className="flex items-center gap-2">
                        <Bus size={16} />
                        <span>Bus</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="train">
                      <div className="flex items-center gap-2">
                        <TrainFront size={16} />
                        <span>Train</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="metro">
                      <div className="flex items-center gap-2">
                        <TramFront size={16} />
                        <span>Metro</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bike">
                      <div className="flex items-center gap-2">
                        <Bike size={16} />
                        <span>Bike/Scooter</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seats and Pricing */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seats">Total Seats Available</Label>
                  <Select 
                    value={formData.totalSeats.toString()} 
                    onValueChange={(value) => handleInputChange('totalSeats', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 seat</SelectItem>
                      <SelectItem value="2">2 seats</SelectItem>
                      <SelectItem value="3">3 seats</SelectItem>
                      <SelectItem value="4">4 seats</SelectItem>
                      <SelectItem value="5">5 seats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Total Trip Cost (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    placeholder="Total estimated cost for the trip"
                    value={formData.totalCost}
                    onChange={(e) => handleInputChange('totalCost', parseInt(e.target.value) || 0)}
                    min="100"
                    step="50"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Include fuel, tolls, and other expenses
                  </p>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Cost Breakdown</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total trip cost:</span>
                      <span>₹{formData.totalCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of passengers:</span>
                      <span>{formData.totalSeats}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Cost per person:</span>
                      <span>₹{calculatePricePerPerson()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Trip..." : "Create Trip"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Trip Guidelines */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 text-primary">Trip Guidelines</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Be punctual and respect departure times</li>
              <li>• Share contact details only after accepting requests</li>
              <li>• Cancellations within 48 hours may affect your reliability score</li>
              <li>• Communicate any changes promptly to all passengers</li>
              <li>• Keep the ride environment safe and comfortable for everyone</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTrip;
