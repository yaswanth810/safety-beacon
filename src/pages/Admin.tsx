import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Users, Shield, MapPin } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalIncidents: 0,
    activeSOS: 0,
  });
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadIncidents();
  }, []);

  const loadStats = async () => {
    const [usersResult, incidentsResult, sosResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("incidents").select("id", { count: "exact", head: true }),
      supabase.from("sos_alerts").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    setStats({
      totalUsers: usersResult.count || 0,
      totalIncidents: incidentsResult.count || 0,
      activeSOS: sosResult.count || 0,
    });
  };

  const loadIncidents = async () => {
    const { data } = await supabase
      .from("incidents")
      .select(`
        *,
        profiles:user_id (full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    setIncidents(data || []);
  };

  const handleStatusChange = async (incidentId: string, newStatus: "new" | "under_review" | "resolved") => {
    const { error } = await supabase
      .from("incidents")
      .update({ status: newStatus })
      .eq("id", incidentId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated successfully");
      const { error: notifyError } = await supabase.functions.invoke("notify-incident-update", {
        body: { incidentId },
      });

      if (notifyError) {
        console.error("Failed to send incident notification email:", notifyError);
      }
      loadIncidents();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "text-blue-600 bg-blue-50";
      case "under_review":
        return "text-yellow-600 bg-yellow-50";
      case "resolved":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const incidentTypes: Record<string, string> = {
    harassment: "Harassment",
    assault: "Assault",
    stalking: "Stalking",
    domestic_violence: "Domestic Violence",
    cyber_harassment: "Cyber Harassment",
    workplace_harassment: "Workplace Harassment",
    other: "Other",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and incident management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidents}</div>
          </CardContent>
        </Card>

        <Card className="border-emergency/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SOS Alerts</CardTitle>
            <Shield className="h-4 w-4 text-emergency" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emergency">{stats.activeSOS}</div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Management */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Reports</CardTitle>
          <CardDescription>Manage and track all incident reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 border rounded-lg space-y-3 hover:shadow-soft transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">
                        {incidentTypes[incident.incident_type]}
                      </span>
                      {incident.is_anonymous && (
                        <span className="text-xs px-2 py-1 bg-muted rounded">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {incident.description}
                    </p>
                    {incident.location_address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {incident.location_address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Reported on: {new Date(incident.created_at).toLocaleString()}
                      {!incident.is_anonymous && incident.profiles?.full_name && (
                        <> by {incident.profiles.full_name}</>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                      {incident.status.replace("_", " ").toUpperCase()}
                    </span>
                    <Select
                      value={incident.status}
                      onValueChange={(value) => handleStatusChange(incident.id, value as "new" | "under_review" | "resolved")}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;