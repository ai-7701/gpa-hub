/* ============================================================
   GPA Ledger — data layer
   One interface, two backends:
     · supabase  — real accounts and records (when config.js is filled)
     · local     — a browser sandbox so the UI works before you connect
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.APP_CONFIG || {};
  const LIVE = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const KEY = "gpahub.local.v1";

  const readLS = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { users: [], session: null }; }
    catch (e) { return { users: [], session: null }; }
  };
  const writeLS = (v) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  };
  const blank = () => ({ users: [], session: null });
  const id = () => "u_" + Math.random().toString(36).slice(2, 10);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- local sandbox ---------- */
  const local = {
    mode: "local",

    async session() {
      const db = readLS();
      if (!db.session) return null;
      const u = db.users.find((x) => x.id === db.session.id);
      return u ? { id: u.id, email: u.email } : null;
    },

    async signUp({ email, password, displayName, handle }) {
      await sleep(250);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (!password || password.length < 6) throw new Error("Password needs at least 6 characters.");
      if (!displayName) throw new Error("Add a display name.");
      const h = (handle || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (h.length < 3) throw new Error("Handle needs at least 3 letters or numbers.");

      const db = readLS();
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error("That email already has an account here.");
      if (db.users.some((u) => u.handle === h)) throw new Error("That handle is taken.");

      const user = {
        id: id(), email, handle: h, display_name: displayName,
        programme: "BTech", school: "", university: "",
        is_public: false, semesters: []
      };
      db.users.push(user);
      db.session = { id: user.id };
      writeLS(db);
      return { id: user.id, email };
    },

    async signIn({ email, password }) {
      await sleep(250);
      const db = readLS();
      const u = db.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      if (!u) throw new Error("No account with that email in this browser. Create one first.");
      db.session = { id: u.id };
      writeLS(db);
      return { id: u.id, email: u.email };
    },

    async signOut() {
      const db = readLS();
      db.session = null;
      writeLS(db);
    },

    async profile(userId) {
      const u = readLS().users.find((x) => x.id === userId);
      if (!u) return null;
      return {
        display_name: u.display_name, handle: u.handle, programme: u.programme,
        school: u.school, university: u.university, is_public: u.is_public
      };
    },

    async saveProfile(userId, patch) {
      const db = readLS();
      const u = db.users.find((x) => x.id === userId);
      if (!u) throw new Error("Not signed in.");
      if (patch.handle) {
        const h = patch.handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (h.length < 3) throw new Error("Handle needs at least 3 characters.");
        if (db.users.some((x) => x.handle === h && x.id !== userId)) throw new Error("That handle is taken.");
        patch = Object.assign({}, patch, { handle: h });
      }
      Object.assign(u, patch);
      writeLS(db);
      return patch;
    },

    async record(userId) {
      const u = readLS().users.find((x) => x.id === userId);
      return u ? JSON.parse(JSON.stringify(u.semesters || [])) : [];
    },

    async saveRecord(userId, semesters) {
      await sleep(200);
      const db = readLS();
      const u = db.users.find((x) => x.id === userId);
      if (!u) throw new Error("Not signed in.");
      u.semesters = JSON.parse(JSON.stringify(semesters));
      writeLS(db);
    },

    async publicRecord(handle) {
      const db = readLS();
      const u = db.users.find((x) => x.handle === String(handle).toLowerCase() && x.is_public);
      if (!u) return null;
      return {
        profile: { display_name: u.display_name, handle: u.handle, programme: u.programme, school: u.school, university: u.university },
        semesters: JSON.parse(JSON.stringify(u.semesters || []))
      };
    }
  };

  /* ---------- readable errors ---------- */
  function friendly(msg) {
    const m = String(msg || "");
    if (/already registered|already been registered|User already exists/i.test(m)) return "That email already has an account — try signing in instead.";
    if (/Database error saving new user/i.test(m)) return "That handle is already taken. Pick another one.";
    if (/duplicate key|unique constraint/i.test(m)) return "That handle is already taken. Pick another one.";
    if (/Invalid login credentials/i.test(m)) return "Wrong email or password.";
    if (/Email not confirmed/i.test(m)) return "Confirm your email first, then sign in.";
    if (/rate limit|too many requests|For security purposes/i.test(m)) return "Too many attempts — wait a minute and try again.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Can't reach the server. Check your connection.";
    return m || "Something went wrong.";
  }

  /* ---------- supabase ---------- */
  function supabaseStore() {
    const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

    return {
      mode: "supabase",
      client: sb,

      async session() {
        const { data } = await sb.auth.getSession();
        return data && data.session ? data.session.user : null;
      },

      async signUp({ email, password, displayName, handle }) {
        const h = (handle || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (h.length < 3) throw new Error("Handle needs at least 3 letters or numbers.");
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { display_name: displayName, handle: h } }
        });
        if (error) throw new Error(friendly(error.message));
        if (data.user && !data.session) {
          throw new Error("Check your email to confirm the account, then sign in.");
        }
        return data.user;
      },

      async signIn({ email, password }) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(friendly(error.message));
        return data.user;
      },

      async signOut() { await sb.auth.signOut(); },

      async profile(userId) {
        const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (error) throw new Error(friendly(error.message));
        return data;
      },

      async saveProfile(userId, patch) {
        if (patch.handle) patch.handle = patch.handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const { error } = await sb.from("profiles").update(patch).eq("id", userId);
        if (error) throw new Error(friendly(error.message));
        return patch;
      },

      async record(userId) {
        const { data, error } = await sb
          .from("semesters")
          .select("label, year, position, courses(code, name, credits, grade, position)")
          .eq("user_id", userId)
          .order("position", { ascending: true });
        if (error) throw new Error(friendly(error.message));
        return (data || []).map((s) => ({
          label: s.label,
          year: s.year,
          courses: (s.courses || [])
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((c) => ({ code: c.code || "", name: c.name, credits: Number(c.credits), grade: c.grade }))
        }));
      },

      async saveRecord(userId, semesters) {
        const del = await sb.from("semesters").delete().eq("user_id", userId);
        if (del.error) throw new Error(del.error.message);

        for (let i = 0; i < semesters.length; i++) {
          const s = semesters[i];
          const ins = await sb.from("semesters")
            .insert({ user_id: userId, label: s.label, year: s.year || "", position: i })
            .select("id").single();
          if (ins.error) throw new Error(ins.error.message);

          const rows = (s.courses || []).map((c, j) => ({
            semester_id: ins.data.id,
            code: c.code || "", name: c.name,
            credits: Number(c.credits) || 0, grade: c.grade, position: j
          }));
          if (rows.length) {
            const cr = await sb.from("courses").insert(rows);
            if (cr.error) throw new Error(cr.error.message);
          }
        }
      },

      async publicRecord(handle) {
        const { data: prof, error } = await sb.from("profiles")
          .select("*").eq("handle", String(handle).toLowerCase()).eq("is_public", true).maybeSingle();
        if (error) throw new Error(error.message);
        if (!prof) return null;
        return { profile: prof, semesters: await this.record(prof.id) };
      }
    };
  }

  window.Store = LIVE ? supabaseStore() : local;
  window.STORE_MODE = LIVE ? "supabase" : "local";
})();
