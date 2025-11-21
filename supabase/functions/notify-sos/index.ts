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

  const sosId = body?.sosId as string | undefined;
  if (!sosId) {
    return new Response(JSON.stringify({ error: "Missing sosId" }), {
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

  const { data: sos, error: sosError } = await adminClient
    .from("sos_alerts")
    .select("*")
    .eq("id", sosId)
    .single();

  if (sosError || !sos) {
    return new Response(JSON.stringify({ error: "SOS alert not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", authUser.id)
    .eq("role", "admin")
    .maybeSingle();

  const isAdmin = !!roleData;

  if (!isAdmin && sos.user_id !== authUser.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    data: targetUserData,
    error: targetUserError,
  } = await adminClient.auth.admin.getUserById(sos.user_id);

  if (targetUserError || !targetUserData?.user?.email) {
    return new Response(JSON.stringify({ error: "Target user email not found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const toEmail = targetUserData.user.email as string;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, emergency_contact_name, emergency_contact_phone")
    .eq("id", sos.user_id)
    .maybeSingle();

  const subject = "SOS alert activated";

  const lines: string[] = [];
  const name = profile?.full_name ? ` ${profile.full_name}` : "";
  lines.push(`Hi${name},`);
  lines.push("");
  lines.push("An SOS alert was activated from your account.");
  lines.push("");
  if (sos.created_at) {
    lines.push(`Time: ${new Date(sos.created_at).toISOString()}`);
  }
  if (sos.location_address) {
    lines.push(`Location: ${sos.location_address}`);
  }
  if (sos.latitude && sos.longitude) {
    lines.push(`Coordinates: ${sos.latitude}, ${sos.longitude}`);
    const mapLink = `https://www.openstreetmap.org/?mlat=${sos.latitude}&mlon=${sos.longitude}#map=18/${sos.latitude}/${sos.longitude}`;
    lines.push(`Map: ${mapLink}`);
  }
  if (profile?.emergency_contact_name || profile?.emergency_contact_phone) {
    lines.push("");
    lines.push("Emergency contact on file:");
    if (profile.emergency_contact_name) {
      lines.push(`Name: ${profile.emergency_contact_name}`);
    }
    if (profile.emergency_contact_phone) {
      lines.push(`Phone: ${profile.emergency_contact_phone}`);
    }
  }
  lines.push("");
  lines.push("If this was not you, please secure your account immediately.");

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
