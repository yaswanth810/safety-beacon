import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'public' }
  });

  const tables = ['profiles', 'sos_alerts', 'incidents', 'forum_posts', 'forum_comments', 'legal_resources', 'user_roles'];
  
  const results: string[] = [];
  
  for (const table of tables) {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `GRANT ALL ON TABLE public.${table} TO anon, authenticated`
    });
    results.push(`${table}: ${error ? error.message : 'OK'}`);
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
