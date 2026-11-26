/* ============================================================
   GPA Ledger — configuration
   Paste your Supabase project values here to switch on real
   accounts. Leave them empty and the site runs in demo mode:
   everything works, but accounts live only in this browser.

   These two values are PUBLIC by design. Your data is protected
   by Row Level Security in Postgres, not by hiding the key.
   NEVER put the service_role key in this file.
   ============================================================ */

window.APP_CONFIG = {
  SUPABASE_URL: "",       // e.g. "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: ""   // Project Settings -> API -> anon public
};
