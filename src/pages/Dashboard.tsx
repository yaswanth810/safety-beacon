import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, Phone, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [activeAlert, setActiveAlert] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        checkActiveAlert(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        checkActiveAlert(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    
    setProfile(data);
  };

  const checkActiveAlert = async (userId: string) => {
    const { data } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setActiveAlert(data);
  };

  const handleSOS = async () => {
    if (!session) return;
    setLoading(true);

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const locationData = await response.json();
      const address = locationData.display_name;

      // Create SOS alert
      const { data: alertData, error } = await supabase
        .from("sos_alerts")
        .insert({
          user_id: session.user.id,
          latitude,
          longitude,
          location_address: address,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveAlert(alertData);
      toast.success("SOS Alert activated! Emergency contacts have been notified.");

      const { error: notifyError } = await supabase.functions.invoke("notify-sos", {
        body: { sosId: alertData.id },
      });

      if (notifyError) {
        console.error("Failed to send SOS notification email:", notifyError);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to activate SOS alert");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateSOS = async () => {
    if (!activeAlert) return;

    const { error } = await supabase
      .from("sos_alerts")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq("id", activeAlert.id);

    if (error) {
      toast.error("Failed to deactivate alert");
    } else {
      setActiveAlert(null);
      toast.success("SOS Alert deactivated");
    }
  };

  const getAlertMapUrl = () => {
    if (!activeAlert || !activeAlert.latitude || !activeAlert.longitude) {
      return null;
    }

    const lat = Number(activeAlert.latitude);
    const lon = Number(activeAlert.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return null;
    }

    const delta = 0.01;
    const south = lat - delta;
    const west = lon - delta;
    const north = lat + delta;
    const east = lon + delta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${lat},${lon}`;
  };

  const mapUrl = getAlertMapUrl();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Women's safety portal
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your safety is our priority. Access emergency support, report incidents, and connect with a supportive community.
        </p>
      </div>

      {/* SOS Button Section */}
      <Card className="border-emergency/20 shadow-emergency">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emergency">
            <AlertTriangle className="w-6 h-6" />
            Emergency SOS
          </CardTitle>
          <CardDescription>
            Press the button below to send an emergency alert with your location to your emergency contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeAlert ? (
            <div className="space-y-4">
              <div className="p-4 bg-emergency/10 border border-emergency/20 rounded-lg">
                <p className="font-semibold text-emergency mb-2">Active SOS Alert</p>
                <p className="text-sm text-muted-foreground">
                  Alert sent at: {new Date(activeAlert.created_at).toLocaleString()}
                </p>
                {activeAlert.location_address && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Location: {activeAlert.location_address}
                  </p>
                )}
                {mapUrl && (
                  <div className="mt-3 h-64 rounded-md overflow-hidden border border-emergency/20 bg-muted">
                    <iframe
                      title="SOS location map"
                      src={mapUrl}
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleDeactivateSOS}
                className="w-full"
              >
                Deactivate Alert
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              onClick={handleSOS}
              disabled={loading}
              className="w-full h-24 text-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground shadow-emergency"
            >
              {loading ? "Activating..." : "Activate SOS"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <Shield className="w-10 h-10 text-primary mb-2" />
            <CardTitle>Report Incident</CardTitle>
            <CardDescription>
              Document and report safety incidents with evidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/incidents"}>
              Create Report
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <Users className="w-10 h-10 text-secondary mb-2" />
            <CardTitle>Community Forum</CardTitle>
            <CardDescription>
              Connect with others and share support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/forum"}>
              Join Discussion
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader>
            <Phone className="w-10 h-10 text-success mb-2" />
            <CardTitle>Legal Resources</CardTitle>
            <CardDescription>
              Access comprehensive legal information and guidance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/legal"}>
              View Resources
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Contacts Info */}
      {profile && !profile.emergency_contact_name && (
        <Card className="border-secondary/20">
          <CardHeader>
            <CardTitle className="text-secondary">Set Up Emergency Contacts</CardTitle>
            <CardDescription>
              Add emergency contacts to your profile to receive instant alerts when you activate SOS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = "/profile"}>
              Update Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;