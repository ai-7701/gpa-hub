# Setup — from zero to real accounts

Follow this once. It takes about 15 minutes, and nothing here costs money.

---

## Part 1 · Create the Supabase project

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign in with **GitHub** (same account you used for Vercel).
3. Click **New project**.
4. Fill in:
   - **Name**: `gpa-ledger`
   - **Database Password**: click **Generate a password**, then **copy it somewhere safe**. You will
     almost never need it, but losing it means a reset.
   - **Region**: **Mumbai (ap-south-1)** if it's listed, otherwise **Singapore (ap-southeast-1)**.
     This is where the database lives, so nearest to you is fastest.
   - **Plan**: Free.
5. Click **Create new project** and wait about 2 minutes while it provisions.

You land on the project dashboard. The left sidebar is your map: **Table Editor**, **SQL Editor**,
**Authentication**, and the gear at the bottom for **Project Settings**.

---

## Part 2 · Create the tables

1. In the sidebar, click **SQL Editor**.
2. Click **+ New query**.
3. Open `supabase/schema.sql` from this repo, select all of it, and paste it into the editor.
4. Click **Run** (or press `Ctrl/Cmd + Enter`).

You should see **"Success. No rows returned"**. That's correct — it created tables and rules, not data.

**Verify:** click **Table Editor** in the sidebar. You should see three tables:
`profiles`, `semesters`, `courses`.

If you see an error instead, the most common cause is running the script twice — it's written to be
safe to re-run, so just run it again.

---

## Part 3 · Turn off email confirmation

This is the step people skip, and then classmates can't sign up.

Supabase's built-in mailer allows only a couple of emails per hour. With confirmation on, the third
person to sign up gets `email rate limit exceeded` and gives up.

1. Sidebar → **Authentication**.
2. Click **Sign In / Providers** (older dashboards: **Providers**).
3. Find **Email** in the list and click it.
4. Turn **Confirm email** to **off**.
5. Click **Save**.

Trade-off: anyone can register with an email they don't own. For a grade tracker shared with
classmates, that's fine. If you later want it strict, turn it back on and connect your own SMTP under
**Authentication → Emails → SMTP Settings**.

---

## Part 4 · Copy the two keys

1. Click the **gear icon** at the bottom of the sidebar → **Project Settings**.
2. Click **API**.
3. Copy these two values:

| Field | Looks like | Safe to expose? |
| --- | --- | --- |
| **Project URL** | `https://abcdefghijkl.supabase.co` | Yes |
| **anon / public** key | `eyJhbGciOiJIUzI1NiIs...` (a long string) | Yes — this is the point of RLS |

**Do not copy the `service_role` / secret key.** That one bypasses every security rule. It never goes
in a browser file.

---

## Part 5 · Put the keys in the site

Open `assets/config.js` and fill both values:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://abcdefghijkl.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIs..."
};
```

Two ways to do it:

**On GitHub (no tools needed)**
1. Go to `https://github.com/ai-7701/gpa-hub/blob/main/assets/config.js`
2. Click the pencil icon.
3. Paste your two values between the quotes.
4. **Commit changes**.

**Or ask me** — paste the two values in chat and I'll commit them.

Either way, Vercel redeploys in about 20 seconds.

---

## Part 6 · Test it end to end

1. Open **https://gpa-hub-chi.vercel.app** in a **private/incognito window** (so no old session).
2. The black demo banner should be **gone**. If it's still there, `config.js` didn't save or the deploy
   hasn't finished — hard-refresh with `Ctrl/Cmd + Shift + R`.
3. Click **Create your account**, fill in a name, handle, email, password.
4. You should land signed in, on an empty record.
5. Click **Add a semester**, type a course, set credits and grade, then **Save changes**.
6. The seal, chart and gauge should fill in immediately.
7. Back in Supabase: **Table Editor → profiles** should show one row; **semesters** and **courses**
   should show yours.

That's it — real accounts are live.

---

## Part 7 · How the pieces fit

```
Browser
  ├─ index.html            markup + dialogs
  ├─ assets/app.js         rendering, calculator, gauge, editor
  ├─ assets/store.js       ──┐  same interface, two backends
  └─ assets/config.js        │
                             ├─ empty keys → localStorage sandbox
                             └─ real keys  → Supabase
                                              ├─ Auth (email + password)
                                              └─ Postgres (RLS enforced)
```

**The data model**

```
profiles          semesters              courses
─────────         ──────────             ─────────
id (=auth user)   id                     id
display_name      user_id  ─────┐        semester_id ──┐
handle (unique)   label         │        code          │
is_public         year          │        name          │
programme         position      │        credits       │
school                          │        grade         │
university                      │        position      │
```

Derived numbers (SGPA, CGPA, percentage) are **never stored** — they're computed from the courses every
time the page loads. That's why a record can't drift out of sync with its own maths.

**Who can read what**

| Who | Can read | Can write |
| --- | --- | --- |
| Signed out | Public profiles only | Nothing |
| Signed in, own record | Everything of theirs | Their own rows |
| Signed in, someone else | Only if that person is public | Nothing |
| Anyone with a public link | That one record | Nothing |

This is enforced by Postgres row-level policies, not by the interface. If you turn "public" off, the
database refuses the read — the link stops working, it doesn't just hide a button.

---

## Part 8 · Day-two operations

**Keep it awake.** Free Supabase projects pause after 7 days with no database activity.
- Create a free monitor at **https://cron-job.org** (or UptimeRobot), pointed at
  `https://gpa-hub-chi.vercel.app` every 15 minutes. A page load alone doesn't query the database, so
  the more reliable ping is a signed-in visit — simplest alternative: open the site yourself once a week.
- If it does pause, the site falls back to the demo record. Resume it from the Supabase dashboard
  (**Resume project**); data is intact.

**Backups.** The free plan has **no automatic backups**.
- To save one: **SQL Editor** → run
  ```sql
  select s.label, s.year, c.name, c.credits, c.grade
  from semesters s join courses c on c.semester_id = s.id
  where s.user_id = auth.uid();
  ```
  → click **Download CSV** in the results panel.

**Changing the grade scale.** If your university uses different grade points, edit `GRADE_SCALE` in
`assets/data.js`. Every number on the site follows it.

**Adding a semester after setup.** Use the site: **Edit record → + Semester → Save changes**. No
GitHub, no redeploy.

**Inviting classmates.** Just send them the URL. Each person creates their own account and sees only
their own record.

---

## Troubleshooting

| What you see | Why | Fix |
| --- | --- | --- |
| Black "Demo mode" banner won't go away | `config.js` empty, or deploy pending | Check the two values, hard-refresh |
| "Check your email to confirm the account" | Email confirmation still on | Part 3 |
| `email rate limit exceeded` | Built-in mailer, 2/hour | Part 3, or connect your own SMTP |
| `relation "public.profiles" does not exist` | Schema never ran | Part 2 |
| `new row violates row-level security policy` | Not signed in, or `user_id` doesn't match the session | Sign out and in again |
| "That handle is already taken" on signup | Handle is unique across all users | Pick another; you can still sign up, the trigger drops the handle |
| Public link shows the demo record | That handle doesn't exist or isn't public | Settings → turn on Public profile |
| Blank page, nothing renders | `supabase-js` CDN blocked by a network/filter | Check the browser console |
| Signup succeeds but the record won't save | Policies missing on `semesters`/`courses` | Re-run `supabase/schema.sql` |
| Everything is slow | Project paused, waking up | First request after a pause takes ~30s |

---

## What this setup does not do

- **Password reset** — Supabase sends these, but the free built-in mailer is rate-limited. Add your own
  SMTP before inviting a large class.
- **Google / GitHub sign-in** — supported by the app's provider settings, but needs an OAuth client
  configured in Supabase → Authentication → Providers. Ask and I'll wire it.
- **Deleting an account** — no button yet. It's one row in `auth.users`; deleting it cascades to
  profiles, semesters and courses.
