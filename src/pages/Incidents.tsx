import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { FileText, MapPin } from "lucide-react";

const Incidents = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [incidentType, setIncidentType] = useState("");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [myIncidents, setMyIncidents] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadMyIncidents(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadMyIncidents(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadMyIncidents = async (userId: string) => {
    const { data } = await supabase
      .from("incidents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    setMyIncidents(data || []);
  };

  const getCurrentLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);

        // Reverse geocode
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          setLocationAddress(data.display_name);
          toast.success("Location captured successfully");
        } catch (error) {
          toast.error("Failed to get address");
        }
        setLoading(false);
      },
      (error) => {
        toast.error("Failed to get location: " + error.message);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("incidents").insert({
        user_id: isAnonymous ? null : session.user.id,
        incident_type: incidentType as any,
        description,
        location_address: locationAddress,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        is_anonymous: isAnonymous,
        status: "new",
      });

      if (error) throw error;

      toast.success("Incident reported successfully");
      setIncidentType("");
      setDescription("");
      setLocationAddress("");
      setLatitude(null);
      setLongitude(null);
      setIsAnonymous(false);
      
      if (session) {
        loadMyIncidents(session.user.id);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const incidentTypes = [
    { value: "harassment", label: "Harassment" },
    { value: "assault", label: "Assault" },
    { value: "stalking", label: "Stalking" },
    { value: "domestic_violence", label: "Domestic Violence" },
    { value: "cyber_harassment", label: "Cyber Harassment" },
    { value: "workplace_harassment", label: "Workplace Harassment" },
    { value: "other", label: "Other" },
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "under_review":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Report Incident</h1>
        <p className="text-muted-foreground">
          Document safety incidents with detailed information. Your report helps create a safer community.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Incident Report</CardTitle>
          <CardDescription>
            Provide as much detail as possible. You can report anonymously if you prefer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="incident-type">Incident Type *</Label>
              <Select value={incidentType} onValueChange={setIncidentType} required>
                <SelectTrigger id="incident-type">
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what happened in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  placeholder="Enter location address"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={loading}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current
                </Button>
              </div>
              {latitude && longitude && (
                <p className="text-sm text-muted-foreground">
                  Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                Report anonymously
              </Label>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Incidents */}
      {myIncidents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">My Reports</h2>
          <div className="grid gap-4">
            {myIncidents.map((incident) => (
              <Card key={incident.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {incidentTypes.find((t) => t.value === incident.incident_type)?.label}
                      </CardTitle>
                      <CardDescription>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        incident.status
                      )}`}
                    >
                      {incident.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {incident.description}
                  </p>
                  {incident.location_address && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {incident.location_address}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;