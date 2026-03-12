import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

Deno.serve(async () => {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
  const client = new Client(dbUrl);
  await client.connect();
  
  const results: string[] = [];
  
  const queries = [
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT",
    "ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS upvotes INTEGER NOT NULL DEFAULT 0",
    `INSERT INTO public.legal_resources (title, description, category, content) VALUES
      ('Protection of Women from Domestic Violence Act, 2005', 'Key provisions of the Domestic Violence Act', 'Domestic Violence', 'The Protection of Women from Domestic Violence Act provides protection to women from domestic violence. Key provisions include:\n\n1. Right to reside in shared household\n2. Protection orders against the abuser\n3. Residence orders\n4. Monetary relief\n5. Custody orders\n6. Compensation orders\n\nWho can file a complaint: Any woman who is or has been in a domestic relationship and has been subjected to domestic violence.\n\nWhere to file: Before the Magistrate Court of the area where the aggrieved person resides.'),
      ('Sexual Harassment at Workplace Act, 2013', 'Understanding workplace harassment laws', 'Workplace Safety', 'The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 provides:\n\n1. Definition of sexual harassment at workplace\n2. Mandatory Internal Complaints Committee (ICC) for organizations with 10+ employees\n3. Local Complaints Committee for smaller organizations\n4. Complaint mechanism and inquiry process\n5. Protection against retaliation\n6. Penalties for non-compliance\n\nTime limit: Complaint must be filed within 3 months of the incident.'),
      ('Indian Penal Code - Section 354', 'Assault or criminal force to woman with intent to outrage her modesty', 'Criminal Law', 'Section 354 of the IPC deals with assault or criminal force on a woman with intent to outrage her modesty:\n\n- Punishment: Imprisonment of 1-5 years and fine\n- Section 354A: Sexual harassment - 1-3 years imprisonment\n- Section 354B: Assault with intent to disrobe - 3-7 years imprisonment\n- Section 354C: Voyeurism - 1-3 years for first conviction\n- Section 354D: Stalking - up to 3 years for first conviction\n\nThese are cognizable and non-bailable offenses.'),
      ('How to File an FIR', 'Step-by-step guide to filing a First Information Report', 'Filing Complaints', 'Steps to file an FIR:\n\n1. Go to the nearest police station\n2. You can file an FIR at any police station (Zero FIR)\n3. The police cannot refuse to register your FIR\n4. Get a copy of the FIR with the FIR number\n5. If police refuse, approach the Superintendent of Police\n6. You can also file an online FIR in many states\n\nImportant: For crimes against women, a female police officer should record the statement. The police station should have a women help desk.'),
      ('National Commission for Women', 'How to approach NCW for help', 'Support Organizations', 'The National Commission for Women (NCW) can help with:\n\n1. Filing complaints online at ncw.nic.in\n2. Toll-free helpline: 7827-170-170\n3. Investigation of complaints\n4. Legal assistance\n5. Counseling services\n\nTypes of complaints handled:\n- Domestic violence\n- Harassment\n- Dowry harassment\n- Workplace harassment\n- Cyber crimes against women\n- Acid attacks\n- Trafficking'),
      ('Cyber Crime Against Women', 'Laws and remedies for online harassment', 'Cyber Safety', 'Legal remedies for cyber crimes against women:\n\n1. IT Act Section 66E: Capturing/publishing private images - 3 years imprisonment\n2. IT Act Section 67: Publishing obscene material - 3-5 years imprisonment\n3. IT Act Section 67A: Publishing sexually explicit material - 5-7 years imprisonment\n4. IPC Section 509: Word, gesture or act intended to insult modesty\n\nHow to report:\n- National Cyber Crime Portal: cybercrime.gov.in\n- Helpline: 1930\n- File FIR at local police station\n- Preserve all evidence (screenshots, URLs)'),
      ('Women Helpline Numbers', 'Emergency and support helpline numbers', 'Emergency Contacts', 'Important helpline numbers:\n\n- Women Helpline (All India): 181\n- Police: 100\n- National Commission for Women: 7827-170-170\n- Domestic Violence Helpline: 181\n- Child Helpline: 1098\n- Legal Aid: 15100\n- Cyber Crime: 1930\n- Emergency Response: 112\n\nThese helplines are available 24/7 and provide free assistance.'),
      ('Right to Free Legal Aid', 'Understanding free legal assistance for women', 'Legal Aid', 'Under the Legal Services Authorities Act, every woman is entitled to free legal aid regardless of income:\n\n1. Free legal counsel\n2. Court fee exemption\n3. Document preparation assistance\n4. Mediation services\n\nHow to access:\n- Contact District Legal Services Authority (DLSA)\n- Visit Taluk Legal Services Committee\n- Call Legal Aid helpline: 15100\n- Visit nearest legal aid clinic\n\nNo income certificate required for women seeking legal aid.')
    ON CONFLICT DO NOTHING`,
  ];
  
  for (const q of queries) {
    try {
      await client.queryArray(q);
      results.push("OK");
    } catch (e) {
      results.push(e.message);
    }
  }
  
  // Notify PostgREST to reload
  try {
    await client.queryArray("NOTIFY pgrst, 'reload schema'");
    results.push("schema reload: OK");
  } catch (e) {
    results.push("schema reload: " + e.message);
  }
  
  await client.end();
  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json" } });
});
