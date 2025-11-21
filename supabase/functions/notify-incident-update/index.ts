import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const fromEmail = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey || !fromEmail) {
    return new Response(JSON.stringify({ error: "Missing function environment configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  let body: any;
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const incidentId = body?.incidentId as string | undefined;
  if (!incidentId) {
    return new Response(JSON.stringify({ error: "Missing incidentId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    data: authUserData,
    error: authUserError,
  } = await anonClient.auth.getUser();

  if (authUserError || !authUserData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authUser = authUserData.user;

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", authUser.id)
    .eq("role", "admin")
    .maybeSingle();

  const isAdmin = !!roleData;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: incident, error: incidentError } = await adminClient
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .single();

  if (incidentError || !incident) {
    return new Response(JSON.stringify({ error: "Incident not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!incident.user_id) {
    return new Response(JSON.stringify({ success: true, skipped: "anonymous incident" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    data: targetUserData,
    error: targetUserError,
  } = await adminClient.auth.admin.getUserById(incident.user_id);

  if (targetUserError || !targetUserData?.user?.email) {
    return new Response(JSON.stringify({ success: true, skipped: "user email not found" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const toEmail = targetUserData.user.email as string;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", incident.user_id)
    .maybeSingle();

  const subject = "Incident status updated";

  const lines: string[] = [];
  const name = profile?.full_name ? ` ${profile.full_name}` : "";
  lines.push(`Hi${name},`);
  lines.push("");
  lines.push("The status of your incident report has been updated.");
  lines.push("");
  if (incident.incident_type) {
    lines.push(`Type: ${incident.incident_type}`);
  }
  if (incident.description) {
    const desc = String(incident.description);
    const shortDesc = desc.length > 200 ? `${desc.slice(0, 197)}...` : desc;
    lines.push(`Description: ${shortDesc}`);
  }
  if (incident.location_address) {
    lines.push(`Location: ${incident.location_address}`);
  }
  if (incident.status) {
    lines.push(`Current status: ${incident.status}`);
  }
  if (incident.created_at) {
    lines.push(`Reported on: ${new Date(incident.created_at).toISOString()}`);
  }
  lines.push("");
  lines.push("You can log in to the Women's safety portal to see full details.");

  const text = lines.join("\n");

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: errorText }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
