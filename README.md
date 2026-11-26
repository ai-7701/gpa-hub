# GPA Ledger

A grade ledger for students: semester GPA, CGPA, a live GPA calculator, a target gauge, and a
shareable public profile. Plain HTML, CSS and JavaScript — no build step.

**Live:** https://gpa-hub-chi.vercel.app

## Two modes

| Mode | When | What happens |
| --- | --- | --- |
| **Demo** | `assets/config.js` has no keys | Accounts and records live in the browser's localStorage. Everything works; nothing leaves the device. A banner says so. |
| **Live** | `assets/config.js` has Supabase keys | Real accounts, records stored in Postgres, public profiles readable by anyone with the link. |

## Setting up accounts (Supabase)

Full click-by-click guide: **[SETUP.md](SETUP.md)**.

1. Create a project at [supabase.com](https://supabase.com) (free tier: 50,000 monthly users, 500 MB database).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. This creates the tables,
   the row-level security policies and the trigger that makes a profile on signup.
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.
4. Paste both into `assets/config.js`.
5. **Authentication → Providers → Email**: turn **Confirm email** off for the smoothest signup, or leave
   it on and be aware the built-in mailer is limited to a few messages an hour — connect your own SMTP
   for real traffic.
6. Redeploy (any push does it).

Never put the `service_role` key in the browser. The anon key is public by design; the RLS policies are
what stop one student reading another's record.

### Free-tier gotcha

A free Supabase project **pauses after 7 days with no activity**. If that happens, the site falls back to
the demo record. Either keep a free uptime monitor pinging the site daily, or move to Pro ($25/mo), which
never pauses.

## How privacy works

Each record is private by default. In **Settings** you can switch on a public profile and pick a handle;
the record is then readable at `?u=yourhandle`. Turning it off locks the link again — the database refuses
the read, so it is not just a hidden button.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup, dialogs, sections |
| `assets/styles.css` | The paper-and-ink design system |
| `assets/app.js` | Rendering, calculator, gauge, chart, editor |
| `assets/store.js` | Data layer: Supabase or the local sandbox |
| `assets/config.js` | Your Supabase URL + anon key |
| `assets/data.js` | Demo record, grade scale, resource links |
| `supabase/schema.sql` | Tables, policies, signup trigger |

## Deploying

Static site, no build command, no output directory.

- **Vercel** — import the repo at [vercel.com/new](https://vercel.com/new); `vercel.json` handles the rest.
- **GitHub Pages** — Settings → Pages → Deploy from a branch → `main` / `(root)`.

## Running locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 — the public-profile link (`?u=handle`) needs a server, not `file://`.

## Design notes

Paper, ink, stamped grade badges, a wax-style seal for the CGPA. Depth comes from rules and hairlines
rather than blur; the only soft surfaces are the inset wells where you type.

## Credit

The record in `assets/data.js` is demo data. Replace it with your own, or sign up and use the editor.
