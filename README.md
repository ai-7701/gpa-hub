# GPA Hub

A single-page site with my semester GPA record, CGPA trend, a GPA calculator and a target planner.
Plain HTML, CSS and JavaScript — no build step, no dependencies.

**Live site:** https://ai-7701.github.io/gpa-hub/

## What's on the page

| Section | What it does |
| --- | --- |
| Hero | CGPA dial, credits earned, percentage, best SGPA |
| Semester record | Every course with credits and grade, SGPA per semester |
| Plotted by hand | Semester GPA vs CGPA on graph paper; hover or tap a point |
| Work the numbers | Add courses, get SGPA live, and see the effect on CGPA |
| The gauge | Drag target CGPA and credits; a needle shows the SGPA you need |
| Grading scale | The university's letter grade to grade point table |
| Index | Links, set as a table of contents |

Light/dark theme follows the system setting and can be toggled; the choice is remembered.
Calculator rows are saved in the browser's localStorage, so they survive a reload.
The page prints as a clean transcript (the calculator and gauge are hidden in print).

## Design notes

The page is built as an academic ledger: paper, ink, stamped grade badges, a wax-style
seal for the CGPA. Controls are inset wells; the only glass is nothing at all — depth comes
from rules, hairlines and hard-edged buttons rather than blur.

## Updating the data

Everything shown is calculated from `assets/data.js`:

- `PROFILE` — name, PRN, programme, school, transcript date
- `GRADE_SCALE` — letter grades and their grade points
- `SEMESTERS` — one object per semester, each with a list of courses
- `RESOURCES` — the link groups at the bottom

To add a semester, copy an existing block inside `SEMESTERS` and edit it. Nothing else needs changing.

## The maths

SGPA = Σ(credits × grade point) ÷ Σ(credits)
CGPA = Σ(semester credits × semester GPA) ÷ Σ(semester credits)
Percentage equivalent = GPA × 10

## Deploying

The repo is static, so it deploys anywhere with no build step.

**Vercel** — import the repo at [vercel.com/new](https://vercel.com/new), pick `ai-7701/gpa-hub`,
keep Framework Preset on **Other**, leave the build command and output directory empty, and press
Deploy. `vercel.json` sets clean URLs and a few security headers. Every push to `main` redeploys.

**GitHub Pages** — Settings → Pages → Deploy from a branch → `main` / `(root)`.

## Running locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Credit

The record shipped in `assets/data.js` is demo data. Replace it with your own.