import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
  
  // Use pg to run grants directly
  const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
  
  const client = new Client(dbUrl);
  await client.connect();
  
  const tables = ['profiles', 'sos_alerts', 'incidents', 'forum_posts', 'forum_comments', 'legal_resources', 'user_roles'];
  const results: string[] = [];
  
  for (const table of tables) {
    try {
      await client.queryArray(`GRANT ALL ON TABLE public.${table} TO anon, authenticated`);
      results.push(`${table}: OK`);
    } catch (e) {
      results.push(`${table}: ${e.message}`);
    }
  }
  
  // Reload PostgREST schema cache
  try {
    await client.queryArray(`NOTIFY pgrst, 'reload schema'`);
    results.push("schema reload: OK");
  } catch (e) {
    results.push(`schema reload: ${e.message}`);
  }
  
  await client.end();

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
