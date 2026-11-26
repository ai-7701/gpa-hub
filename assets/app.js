/* ============================================================
   GPA Ledger — app
   Renders whatever record is active (yours, a public profile,
   or the demo), and wires the account UI.
   ============================================================ */
(function () {
  "use strict";

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const f2  = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pointOf = (g) => { const r = GRADE_SCALE.find((x) => x.g === g); return r ? r.p : 0; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- state ---------------- */
  const S = {
    user: null,
    profile: null,
    semesters: [],
    record: { rows: [], credits: 0, points: 0, cgpa: 0 },
    view: "landing",      // landing | app | public
    canEdit: false,
    editing: false,
    draft: null
  };

  function computeRecord(semesters) {
    const rows = (semesters || []).map((s) => {
      let credits = 0, points = 0;
      (s.courses || []).forEach((c) => {
        const cr = num(c.credits);
        credits += cr;
        points += cr * pointOf(c.grade);
      });
      return { meta: s, credits, points, gpa: credits > 0 ? points / credits : 0 };
    });
    const credits = rows.reduce((a, r) => a + r.credits, 0);
    const points = rows.reduce((a, r) => a + r.points, 0);
    return { rows, credits, points, cgpa: credits > 0 ? points / credits : 0 };
  }

  /* ---------------- theme ---------------- */
  const THEME_KEY = "gpahub.theme";
  function paintTheme(t) {
    document.documentElement.dataset.theme = t;
    $("#themeBtn").setAttribute("aria-checked", t === "dark" ? "true" : "false");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#12130d" : "#f4efe4");
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  $("#themeBtn").addEventListener("click", () => {
    paintTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  /* ---------------- small helpers ---------------- */
  function countUp(node, to, decimals, suffix) {
    suffix = suffix || "";
    if (!node) return;
    if (REDUCED) { node.textContent = to.toFixed(decimals) + suffix; return; }
    const dur = 850, t0 = performance.now();
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = (to * e).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else node.textContent = to.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(step);
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("is-on"), 2400);
  }

  function openDialog(id) {
    const d = document.getElementById(id);
    if (d && d.showModal) d.showModal();
    else if (d) d.setAttribute("open", "");
  }
  function closeDialog(d) {
    if (d && d.close) d.close();
    else if (d) d.removeAttribute("open");
  }
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => closeDialog(b.closest("dialog"))));
  $$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) closeDialog(d); }));

  /* ---------------- reveal + scroll ---------------- */
  let revealObserver = null;
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); revealObserver.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  function observeReveals(root) {
    $$(".reveal", root || document).forEach((n) => {
      if (n.classList.contains("is-in")) return;
      if (revealObserver) revealObserver.observe(n);
      else n.classList.add("is-in");
    });
  }

  /* ---------------- hero ---------------- */
  function renderHero() {
    const p = S.profile || {};
    const isDemo = S.view === "landing";
    $("#heroName").textContent = p.display_name || (isDemo ? "Sample Student" : "Your record");
    $("#heroProg").textContent = p.programme || "BTech";
    $("#heroSchool").textContent = p.school || "School of Computing and Data Science";
    $("#heroUni").textContent = p.university || "Your University";
    $("#heroKicker").innerHTML = isDemo
      ? 'A sample record · <span class="mono">sign in to start yours</span>'
      : "Academic record" + (p.handle ? ' · <span class="mono">@' + esc(p.handle) + "</span>" : "");
    $("#sealText").textContent = ((p.university || "GPA LEDGER") + " · SEMESTER RECORD · CGPA · ").toUpperCase();

    const cgpa = S.record.cgpa;
    const has = S.record.credits > 0;
    const cgpaEl = $("#cgpaValue");
    cgpaEl.classList.toggle("is-empty", !has);
    if (has) countUp(cgpaEl, cgpa, 2);
    else cgpaEl.textContent = "—";
    countUp($("#statCredits"), S.record.credits, 0);
    countUp($("#statSems"), S.record.rows.length, 0);
    const pct = $("#statPct");
    if (has) countUp(pct, cgpa * 10, 2, "%"); else pct.textContent = "—";
    const best = $("#statBest");
    if (has) countUp(best, Math.max.apply(null, S.record.rows.map((r) => r.gpa)), 2); else best.textContent = "—";

    $("#heroNote").innerHTML = isDemo
      ? "You're looking at a <strong>sample record</strong>. Create an account and the same calculator, chart and gauge work on your own grades."
      : S.record.rows.length + " semester" + (S.record.rows.length === 1 ? "" : "s") +
        " on file. Every figure below is computed from the course list — nothing is typed in twice.";

    const ring = $("#ringFill");
    const r = parseFloat(ring.getAttribute("r"));
    const C = 2 * Math.PI * r;
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = has ? C * (1 - Math.min(cgpa, 10) / 10) : C;

    renderHeroActions();
  }

  function renderHeroActions() {
    const host = $("#heroActions");
    host.innerHTML = "";
    const add = (label, cls, fn) => {
      const b = el("button", "btn " + cls, label);
      b.type = "button";
      b.addEventListener("click", fn);
      host.appendChild(b);
    };
    if (S.view === "landing") {
      add("Create your account", "btn-primary", () => openAuth("up"));
      add("Sign in", "btn-ghost", () => openAuth("in"));
    } else if (S.view === "public") {
      add("Start your own ledger", "btn-primary", () => openAuth("up"));
    } else {
      add(S.editing ? "Cancel editing" : "Edit record", "btn-primary", () => (S.editing ? cancelEdit() : startEdit()));
      add("Settings", "btn-ghost", openSettings);
      const b = el("button", "btn btn-ghost", "Print transcript");
      b.type = "button";
      b.addEventListener("click", () => window.print());
      host.appendChild(b);
    }
  }

  /* ---------------- top bar auth area ---------------- */
  function renderAuthArea() {
    const host = $("#authArea");
    host.innerHTML = "";
    if (S.user && S.profile) {
      const b = el("button", "user-chip");
      b.type = "button";
      b.title = "Settings";
      b.innerHTML = '<span class="avatar">' + esc(initials(S.profile.display_name)) + "</span>" +
                    '<span class="user-name">' + esc(S.profile.display_name) + "</span>";
      b.addEventListener("click", openSettings);
      host.appendChild(b);
    } else {
      const b = el("button", "btn btn-ghost btn-sm", "Sign in");
      b.type = "button";
      b.addEventListener("click", () => openAuth("in"));
      host.appendChild(b);
    }
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
  }

  /* ---------------- banner ---------------- */
  function renderBanner() {
    const bar = $("#demoBanner");
    const text = $("#bannerText");
    const action = $("#bannerAction");
    action.hidden = true;

    if (S.view === "public") {
      text.innerHTML = "You're viewing <strong>" + esc(S.profile.display_name) + "</strong>'s public record — read only.";
      bar.hidden = false;
      return;
    }
    if (window.STORE_MODE === "local" && S.view !== "public") {
      text.innerHTML = window.STORE_CONFIGURED
        ? "<strong>Offline</strong> — the Supabase library didn't load, so you're in a local sandbox. Check your connection and reload."
        : "<strong>Demo mode</strong> — accounts and records stay in this browser only. Add your Supabase keys in <span class=\"mono\">assets/config.js</span> to go live.";
      bar.hidden = false;
      return;
    }
    bar.hidden = true;
  }

  /* ---------------- semester cards ---------------- */
  function renderSemesters() {
    const host = $("#semGrid");
    host.innerHTML = "";
    const list = S.editing ? S.draft : S.semesters;

    $("#emptyState").hidden = !(list.length === 0);
    $("#editBar").hidden = !S.editing;

    if (!list.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;

    const computed = computeRecord(list);
    list.forEach((sem, si) => {
      const stats = computed.rows[si];
      const card = el("article", "card sem-card" + (S.editing ? " is-editing" : ""));

      const head = el("div", "sem-head");
      if (S.editing) {
        head.appendChild(el("div", "",
          '<input class="sem-label-input" value="' + esc(sem.label) + '" aria-label="Semester name" data-si="' + si + '" data-field="label" />' +
          '<input class="sem-year-input" value="' + esc(sem.year || "") + '" aria-label="Academic year" data-si="' + si + '" data-field="year" placeholder="2025-26" />'));
        const del = el("button", "row-del", "&times;");
        del.type = "button";
        del.title = "Delete this semester";
        del.addEventListener("click", () => {
          S.draft.splice(si, 1);
          renderSemesters();
        });
        head.appendChild(del);
      } else {
        head.appendChild(el("div", "",
          '<h3 class="sem-title">' + esc(sem.label) + '</h3>' +
          '<p class="sem-year">' + (sem.year ? "Academic year " + esc(sem.year) : "&nbsp;") + "</p>"));
        head.appendChild(el("div", "sem-score",
          '<span class="sem-gpa">' + f2(stats.gpa) + "</span>" +
          '<span class="sem-credits">' + stats.credits + " credits</span>"));
      }
      card.appendChild(head);

      const table = el("table", "sem-table");
      table.innerHTML = "<thead><tr><th>Course</th><th class=\"num\">Credits</th><th>Grade</th>" +
        (S.editing ? "<th></th>" : "") + "</tr></thead>";
      const tb = el("tbody");

      (sem.courses || []).forEach((c, ci) => {
        if (S.editing) {
          const tr = el("tr");
          const tdN = el("td");
          const inN = el("input", "cell-input");
          inN.value = c.name; inN.placeholder = "Course name";
          inN.setAttribute("aria-label", "Course name");
          inN.addEventListener("input", (e) => { c.name = e.target.value; });
          tdN.appendChild(inN);

          const tdC = el("td", "num");
          const inC = el("input", "cell-input num");
          inC.type = "number"; inC.min = "0"; inC.max = "20"; inC.step = "1";
          inC.value = c.credits;
          inC.setAttribute("aria-label", "Credits");
          inC.addEventListener("input", (e) => { c.credits = num(e.target.value); });
          tdC.appendChild(inC);

          const tdG = el("td");
          const sel = el("select", "cell-input");
          sel.innerHTML = GRADE_SCALE.map((g) => '<option value="' + g.g + '"' + (g.g === c.grade ? " selected" : "") + ">" + g.g + "</option>").join("");
          sel.setAttribute("aria-label", "Grade");
          sel.addEventListener("change", (e) => { c.grade = e.target.value; });
          tdG.appendChild(sel);

          const tdD = el("td");
          const del = el("button", "row-del", "&times;");
          del.type = "button";
          del.title = "Remove course";
          del.addEventListener("click", () => { sem.courses.splice(ci, 1); renderSemesters(); });
          tdD.appendChild(del);

          tr.append(tdN, tdC, tdG, tdD);
          tb.appendChild(tr);
        } else {
          const p = pointOf(c.grade);
          tb.appendChild(el("tr", "",
            "<td>" + esc(c.name) + (c.code ? '<span class="c-code">' + esc(c.code) + "</span>" : "") + "</td>" +
            '<td class="num">' + num(c.credits).toFixed(1) + "</td>" +
            '<td><span class="pill g-' + p + '">' + esc(c.grade) + "</span></td>"));
        }
      });
      table.appendChild(tb);
      card.appendChild(table);

      if (S.editing) {
        const foot = el("div", "sem-foot");
        const add = el("button", "btn btn-quiet btn-sm", "+ Add course");
        add.type = "button";
        add.addEventListener("click", () => {
          sem.courses.push({ name: "", code: "", credits: 4, grade: "O" });
          renderSemesters();
        });
        foot.appendChild(add);
        card.appendChild(foot);
      }

      host.appendChild(card);
    });

    // keep label/year inputs in sync with the draft
    $$(".sem-label-input, .sem-year-input", host).forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const i = Number(e.target.dataset.si);
        S.draft[i][e.target.dataset.field] = e.target.value;
      });
    });

    observeReveals(host);
  }

  /* ---------------- grading key + index ---------------- */
  function renderScale() {
    const host = $("#scaleGrid");
    host.innerHTML = "";
    GRADE_SCALE.forEach((g) => {
      host.appendChild(el("div", "scale-item",
        '<span class="g">' + g.g + "</span>" +
        '<span class="d">' + g.d + "</span>" +
        '<span class="p">' + g.p + "</span>"));
    });
  }

  function renderResources() {
    const host = $("#resGrid");
    host.innerHTML = "";
    RESOURCES.forEach((group) => {
      const col = el("div", "res-col");
      col.appendChild(el("h3", "", group.title));
      const ul = el("ul", "res-list");
      group.items.forEach((it) => {
        const a = el("a", "res-link");
        a.href = it.url; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.innerHTML = '<span class="res-name">' + esc(it.name) + "</span>" +
                      '<span class="res-note">' + esc(it.note) + "</span>" +
                      '<span class="res-arrow">↗</span>';
        const li = el("li");
        li.appendChild(a);
        ul.appendChild(li);
      });
      col.appendChild(ul);
      host.appendChild(col);
    });
  }

  /* ---------------- chart ---------------- */
  let projection = null;
  let chartAnimated = false;
  let closeTips = function () {};

  function renderChart() {
    const host = $("#chartHost");
    const cw = Math.max(300, Math.round(host.clientWidth || 760));
    const narrow = cw < 560;
    const W = Math.min(760, cw);
    const H = narrow ? 260 : 310;
    const m = narrow ? { t: 30, r: 18, b: 38, l: 30 } : { t: 34, r: 34, b: 46, l: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const R = S.record;

    if (!R.rows.length) {
      host.innerHTML = '<p class="chart-empty">Add a semester and the line appears here.</p>';
      $("#projLegend").hidden = true;
      return;
    }

    const sems = R.rows.map((r, i) => {
      let c = 0, p = 0;
      for (let k = 0; k <= i; k++) { c += R.rows[k].credits; p += R.rows[k].points; }
      return { label: r.meta.label || "Sem " + (i + 1), gpa: r.gpa, cgpa: c > 0 ? p / c : 0, credits: r.credits, courses: (r.meta.courses || []).length };
    });

    const pts = sems.slice();
    if (projection) pts.push({ label: "Next", gpa: projection.value, cgpa: projection.cgpa, ghost: true });

    const all = pts.reduce((a, p) => a.concat([p.gpa, p.cgpa]), []);
    let lo = Math.max(0, Math.floor(Math.min.apply(null, all) - 0.6));
    let hi = Math.min(10, Math.ceil(Math.max.apply(null, all) + 0.6));
    if (hi - lo < 2) { hi = Math.min(10, lo + 2); lo = Math.max(0, hi - 2); }
    if (hi - lo < 1) hi = lo + 1;

    const x = (i) => (pts.length === 1 ? m.l + iw / 2 : m.l + (iw * i) / (pts.length - 1));
    const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;

    const svg = [];
    svg.push('<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Semester GPA and CGPA chart">');
    svg.push('<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--oxblood)" stop-opacity="0.09"/>' +
      '<stop offset="100%" stop-color="var(--oxblood)" stop-opacity="0"/>' +
      "</linearGradient></defs>");

    const step = hi - lo <= 3 ? 1 : Math.ceil((hi - lo) / 4);
    for (let v = lo; v <= hi + 1e-9; v += step) {
      const yy = y(v);
      svg.push('<line class="grid-line" x1="' + m.l + '" y1="' + yy.toFixed(1) + '" x2="' + (W - m.r) + '" y2="' + yy.toFixed(1) + '"/>');
      svg.push('<text class="axis-text" style="font-size:' + (narrow ? 10 : 11) + 'px" x="' + (m.l - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + v.toFixed(0) + "</text>");
    }

    if (pts.length > 1) {
      let d = "M " + x(0) + " " + y(pts[0].gpa);
      pts.forEach((p, i) => { if (i) d += " L " + x(i).toFixed(1) + " " + y(p.gpa).toFixed(1); });
      d += " L " + x(pts.length - 1).toFixed(1) + " " + (m.t + ih) + " L " + x(0) + " " + (m.t + ih) + " Z";
      svg.push('<path class="area" d="' + d + '"/>');
    }

    let dcg = "";
    pts.forEach((p, i) => { dcg += (i ? " L " : "M ") + x(i).toFixed(1) + " " + y(p.cgpa).toFixed(1); });
    svg.push('<path class="line-cgpa" d="' + dcg + '"/>');

    let solid = "", dashed = "";
    pts.forEach((p, i) => {
      if (p.ghost) {
        if (i > 0) dashed += " M " + x(i - 1).toFixed(1) + " " + y(pts[i - 1].gpa).toFixed(1) + " L " + x(i).toFixed(1) + " " + y(p.gpa).toFixed(1);
      } else {
        solid += (solid ? " L " : "M ") + x(i).toFixed(1) + " " + y(p.gpa).toFixed(1);
      }
    });
    if (solid) svg.push('<path class="line-sgpa" d="' + solid + '"/>');
    if (dashed) svg.push('<path class="line-sgpa" style="stroke-dasharray:6 6;opacity:.8" d="' + dashed + '"/>');

    const hot = [];
    pts.forEach((p, i) => {
      const cx = x(i), cy = y(p.gpa);
      const col = p.ghost ? "var(--gold)" : "var(--oxblood)";
      svg.push('<circle class="pt" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (narrow ? 4.5 : 5.5) + '" fill="' + col + '" stroke="var(--paper-raise)" stroke-width="2"/>');
      svg.push('<text class="val-label' + (p.ghost ? " val-label-ghost" : "") + '" style="font-size:' + (narrow ? 11 : 12) + 'px" x="' + cx.toFixed(1) + '" y="' + (cy - 12).toFixed(1) + '" text-anchor="middle">' + f2(p.gpa) + "</text>");
      svg.push('<circle cx="' + cx.toFixed(1) + '" cy="' + y(p.cgpa).toFixed(1) + '" r="3.4" fill="var(--forest)"/>');
      svg.push('<text class="x-label" style="font-size:' + (narrow ? 10.5 : 11) + 'px" x="' + cx.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + esc(p.label) + "</text>");
      hot.push({ cx, cy, p });
    });

    hot.forEach((h) => {
      const p = h.p;
      const body = p.ghost
        ? '<p class="tip-title">Projected</p><p class="tip-row"><span>SGPA needed</span><b>' + f2(p.gpa) + "</b></p>" +
          '<p class="tip-row"><span>CGPA then</span><b>' + f2(p.cgpa) + "</b></p>"
        : '<p class="tip-title">' + esc(p.label) + "</p>" +
          '<p class="tip-row"><span>SGPA</span><b>' + f2(p.gpa) + "</b></p>" +
          '<p class="tip-row"><span>CGPA</span><b>' + f2(p.cgpa) + "</b></p>" +
          '<p class="tip-row"><span>Credits</span><b>' + p.credits + "</b></p>" +
          '<p class="tip-row"><span>Courses</span><b>' + p.courses + "</b></p>";
      svg.push('<circle class="hit" data-tip="' + encodeURIComponent(body) + '" cx="' + h.cx.toFixed(1) + '" cy="' + h.cy.toFixed(1) + '" r="20" tabindex="0" role="button" aria-label="' +
        (p.ghost ? "Projected semester" : esc(p.label) + ", SGPA " + f2(p.gpa)) + '"/>');
    });

    svg.push("</svg>");
    host.innerHTML = svg.join("");
    $("#projLegend").hidden = !projection;
    wireTips(host);
    if (!chartAnimated && !REDUCED) armLine(host);
  }

  function armLine(host) {
    const path = host.querySelector(".line-sgpa");
    if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
  }
  function animateLine(host) {
    const path = host.querySelector(".line-sgpa");
    if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1)";
    requestAnimationFrame(() => { path.style.strokeDashoffset = "0"; });
  }

  function wireTips(host) {
    const tip = $("#tip");
    function place(x, y) {
      const r = tip.getBoundingClientRect();
      let left = clamp(x - r.width / 2, 8, window.innerWidth - r.width - 8);
      let top = y - r.height - 14;
      if (top < 8) top = y + 18;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }
    function open(node, x, y) {
      tip.innerHTML = decodeURIComponent(node.dataset.tip);
      tip.hidden = false;
      place(x, y);
    }
    function close() { tip.hidden = true; }
    $$(".hit", host).forEach((node) => {
      node.addEventListener("pointerenter", (e) => open(node, e.clientX, e.clientY));
      node.addEventListener("pointermove", (e) => place(e.clientX, e.clientY));
      node.addEventListener("pointerleave", close);
      node.addEventListener("pointerdown", (e) => open(node, e.clientX, e.clientY));
      node.addEventListener("focus", () => { const b = node.getBoundingClientRect(); open(node, b.left + b.width / 2, b.top); });
      node.addEventListener("blur", close);
    });
    closeTips = close;
  }

  /* ---------------- calculator ---------------- */
  const CALC_KEY = "gpahub.calc.v3";
  let calcRows = [];
  let calcSnapshot = null;

  function blankRow() { return { name: "", credits: 0, grade: "O" }; }
  function loadCalc() {
    try {
      const raw = localStorage.getItem(CALC_KEY);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
    } catch (e) {}
    return [blankRow()];
  }
  function saveCalc() { try { localStorage.setItem(CALC_KEY, JSON.stringify(calcRows)); } catch (e) {} }

  function renderCalcRows(newIndex) {
    const body = $("#calcBody");
    body.innerHTML = "";
    calcRows.forEach((row, i) => {
      const tr = el("tr", i === newIndex ? "is-new" : "");
      const tdName = el("td");
      const inpName = el("input");
      inpName.type = "text"; inpName.value = row.name; inpName.placeholder = "Course name";
      inpName.setAttribute("aria-label", "Course name");
      inpName.addEventListener("input", (e) => { calcRows[i].name = e.target.value; saveCalc(); });
      tdName.appendChild(inpName);

      const tdCr = el("td");
      const inpCr = el("input");
      inpCr.type = "number"; inpCr.min = "0"; inpCr.max = "20"; inpCr.step = "1"; inpCr.value = row.credits;
      inpCr.setAttribute("aria-label", "Credits");
      inpCr.addEventListener("input", (e) => { calcRows[i].credits = num(e.target.value); saveCalc(); updateCalc(); });
      tdCr.appendChild(inpCr);

      const tdGr = el("td");
      const selGr = el("select");
      selGr.innerHTML = GRADE_SCALE.map((g) => '<option value="' + g.g + '"' + (g.g === row.grade ? " selected" : "") + ">" + g.g + "</option>").join("");
      selGr.setAttribute("aria-label", "Grade");
      selGr.addEventListener("change", (e) => { calcRows[i].grade = e.target.value; saveCalc(); updateCalc(); });
      tdGr.appendChild(selGr);

      const tdPts = el("td", "pts", String(pointOf(row.grade)));

      const tdDel = el("td");
      const del = el("button", "row-del", "&times;");
      del.type = "button"; del.title = "Remove course"; del.setAttribute("aria-label", "Remove course");
      del.addEventListener("click", () => {
        calcRows.splice(i, 1);
        if (!calcRows.length) calcRows.push(blankRow());
        saveCalc(); renderCalcRows(); updateCalc();
      });
      tdDel.appendChild(del);

      tr.append(tdName, tdCr, tdGr, tdPts, tdDel);
      body.appendChild(tr);
    });
  }

  function updateCalc() {
    let credits = 0, points = 0;
    calcRows.forEach((c) => { credits += num(c.credits); points += num(c.credits) * pointOf(c.grade); });
    const has = credits > 0;
    const sgpa = has ? points / credits : 0;

    const sgpaEl = $("#calcSgpa");
    const next = has ? f2(sgpa) : "—";
    if (sgpaEl.textContent !== next && next !== "—" && !REDUCED) {
      sgpaEl.classList.remove("pop"); void sgpaEl.offsetWidth; sgpaEl.classList.add("pop");
    }
    sgpaEl.textContent = next;
    $("#calcCredits").textContent = credits;
    $("#calcPoints").textContent = Math.round(points * 100) / 100;

    const R = S.record;
    const newCredits = R.credits + credits;
    const newCgpa = newCredits > 0 ? (R.points + points) / newCredits : 0;
    $("#calcNewCgpa").textContent = has ? f2(newCgpa) : "—";

    const d = $("#calcDelta");
    d.classList.remove("up", "down");
    if (!has) {
      d.textContent = R.credits > 0 ? "Add courses to see the effect." : "Add courses, then add them to your record.";
    } else if (!R.credits) {
      d.textContent = "That would be your starting CGPA.";
    } else {
      const rd = Math.round((newCgpa - R.cgpa) * 100) / 100;
      if (rd === 0) d.textContent = "• No change — stays at " + f2(R.cgpa) + " over " + newCredits + " credits";
      else {
        d.textContent = (rd > 0 ? "▲ +" : "▼ −") + f2(Math.abs(rd)) + " vs current " + f2(R.cgpa) + " over " + newCredits + " credits";
        d.classList.add(rd > 0 ? "up" : "down");
      }
    }
    calcSnapshot = has ? { credits, sgpa } : null;
  }

  function buildPresets() {
    const row = $("#presetRow");
    SEMESTERS.forEach((s, i) => {
      const b = el("button", "chip", s.label);
      b.type = "button"; b.dataset.preset = String(i);
      row.appendChild(b);
    });
  }

  function setPreset(kind) {
    if (kind === "blank") calcRows = [blankRow()];
    else calcRows = SEMESTERS[parseInt(kind, 10)].courses.map((c) => ({ name: c.name, credits: c.credits, grade: c.grade }));
    saveCalc(); renderCalcRows(); updateCalc();
    $$("#presetRow .chip").forEach((b) => b.classList.toggle("is-active", b.dataset.preset === kind));
  }

  /* ---------------- gauge ---------------- */
  function buildGaugeTicks() {
    let out = "";
    for (let v = 6; v <= 10.0001; v += 0.5) {
      const t = (v - 6) / 4;
      const a = (-90 + t * 180) * Math.PI / 180;
      const major = Math.abs(v - Math.round(v)) < 1e-6;
      const r1 = 120, r2 = major ? 132 : 128;
      out += '<line class="gauge-tick' + (major ? " major" : "") + '" x1="' + (150 + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (165 - r1 * Math.cos(a)).toFixed(1) +
        '" x2="' + (150 + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (165 - r2 * Math.cos(a)).toFixed(1) + '"/>';
      if (major) {
        out += '<text class="gauge-tick-label" x="' + (150 + 138 * Math.sin(a)).toFixed(1) + '" y="' + (165 - 138 * Math.cos(a) + 3).toFixed(1) + '" text-anchor="middle">' + v.toFixed(0) + "</text>";
      }
    }
    $("#gaugeTicks").innerHTML = out;
  }

  function setSliderFill(input) {
    const min = num(input.min), max = num(input.max);
    input.style.setProperty("--fill", (((num(input.value) - min) / (max - min)) * 100).toFixed(1) + "%");
  }

  function updatePlanner() {
    const tEl = $("#targetCgpa"), cEl = $("#targetCredits");
    const T = clamp(num(tEl.value), 6, 10);
    const N = clamp(Math.round(num(cEl.value)), 1, 40);
    $("#targetCgpaOut").textContent = T.toFixed(2);
    $("#targetCreditsOut").textContent = String(N);
    setSliderFill(tEl); setSliderFill(cEl);

    const R = S.record;
    $("#plannerBase").textContent = R.credits + " credits · " + Math.round(R.points * 100) / 100 + " points";

    if (!R.credits) {
      $("#needSgpa").textContent = "—";
      $("#bestCgpa").textContent = "—";
      $("#needVerdict").textContent = "Add a semester first — the gauge needs a starting point.";
      $("#needVerdict").classList.remove("up", "down");
      $("#gaugeNeedle").style.transform = "rotate(-90deg)";
      const arc0 = $("#gaugeArc");
      if (arc0.getTotalLength) { const L = arc0.getTotalLength(); arc0.style.strokeDasharray = L; arc0.style.strokeDashoffset = L; }
      projection = null;
      renderChart();
      return;
    }

    const need = (T * (R.credits + N) - R.points) / N;
    const best = (R.points + 10 * N) / (R.credits + N);
    $("#needSgpa").textContent = need > 10 ? "10.00+" : f2(Math.max(0, need));
    $("#bestCgpa").textContent = f2(best);

    const verdict = $("#needVerdict");
    verdict.classList.remove("up", "down");
    if (need > 10) {
      verdict.textContent = "Not reachable in one semester. Even a perfect 10.00 SGPA gets you to " + f2(best) + ".";
      verdict.classList.add("down"); projection = null;
    } else if (need <= 0) {
      verdict.textContent = "Already secure — any SGPA this semester keeps you at or above " + f2(T) + ".";
      verdict.classList.add("up"); projection = { value: clamp(need, 0, 10), cgpa: best };
    } else {
      verdict.textContent = "Reachable — that is " + f2(need * 10) + "% equivalent. You averaged " + f2(R.cgpa) + " so far.";
      verdict.classList.add("up"); projection = { value: need, cgpa: T };
    }

    const t = (clamp(need, 6, 10) - 6) / 4;
    $("#gaugeNeedle").style.transform = "rotate(" + (-90 + t * 180).toFixed(2) + "deg)";
    const arc = $("#gaugeArc");
    if (arc.getTotalLength) {
      const L = arc.getTotalLength();
      arc.style.strokeDasharray = L;
      arc.style.strokeDashoffset = L * (1 - t);
    }
    arc.classList.toggle("is-over", need > 10);

    const cur = clamp(R.cgpa, 6, 10);
    const ca = (-90 + ((cur - 6) / 4) * 180) * Math.PI / 180;
    const mk = $("#gaugeMarker");
    mk.setAttribute("x1", (150 + 128 * Math.sin(ca)).toFixed(1));
    mk.setAttribute("y1", (165 - 128 * Math.cos(ca)).toFixed(1));
    mk.setAttribute("x2", (150 + 142 * Math.sin(ca)).toFixed(1));
    mk.setAttribute("y2", (165 - 142 * Math.cos(ca)).toFixed(1));

    renderChart();
  }

  /* ---------------- editing ---------------- */
  function startEdit() {
    if (!S.canEdit) return;
    S.editing = true;
    S.draft = clone(S.semesters);
    if (!S.draft.length) addSemesterToDraft();
    renderSemesters();
    renderHeroActions();
    document.getElementById("semesters").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    S.editing = false;
    S.draft = null;
    renderSemesters();
    renderHeroActions();
  }

  function addSemesterToDraft() {
    const n = (S.draft || []).length + 1;
    S.draft.push({ label: "Semester " + n, year: "", courses: [{ name: "", code: "", credits: 4, grade: "O" }] });
  }

  async function saveEdit() {
    const btn = $("#saveEdit");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const clean = S.draft.map((s) => ({
        label: s.label || "Semester",
        year: s.year || "",
        courses: (s.courses || []).filter((c) => String(c.name).trim() !== "")
          .map((c) => ({ name: String(c.name).trim(), code: c.code || "", credits: num(c.credits), grade: c.grade }))
      }));
      await Store.saveRecord(S.user.id, clean);
      S.semesters = clean;
      S.record = computeRecord(clean);
      S.editing = false;
      S.draft = null;
      renderAll();
      toast("Record saved");
    } catch (e) {
      toast("Could not save: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save changes";
    }
  }

  /* ---------------- auth ---------------- */
  let authTab = "in";

  function openAuth(tab) {
    authTab = tab || "in";
    $("#authError").textContent = "";
    setAuthTab(authTab);
    openDialog("authDialog");
    setTimeout(() => { if (authTab === "up") $("#authName").focus(); else $("#authEmail").focus(); }, 60);
  }

  function setAuthTab(tab) {
    authTab = tab;
    $$("#authDialog .tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("#signupOnly").hidden = tab !== "up";
    $("#authTitle").textContent = tab === "up" ? "Create your account" : "Welcome back";
    $("#authSubmit").textContent = tab === "up" ? "Create account" : "Sign in";
    $("#authPass").setAttribute("autocomplete", tab === "up" ? "new-password" : "current-password");
    $("#authHint").innerHTML = window.STORE_MODE === "local"
      ? "Demo mode: this account is stored in this browser only."
      : "Your record is private unless you turn on a public profile.";
  }

  async function submitAuth(e) {
    e.preventDefault();
    const btn = $("#authSubmit");
    const err = $("#authError");
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = authTab === "up" ? "Creating…" : "Signing in…";
    try {
      const payload = {
        email: $("#authEmail").value.trim(),
        password: $("#authPass").value,
        displayName: $("#authName").value.trim(),
        handle: $("#authHandle").value.trim()
      };
      if (authTab === "up") await Store.signUp(payload);
      else await Store.signIn(payload);
      closeDialog($("#authDialog"));
      $("#authForm").reset();
      await boot();
      toast(authTab === "up" ? "Account created" : "Signed in");
    } catch (ex) {
      err.textContent = ex.message || "Something went wrong.";
    } finally {
      btn.disabled = false;
      btn.textContent = authTab === "up" ? "Create account" : "Sign in";
    }
  }

  /* ---------------- settings ---------------- */
  async function openSettings() {
    if (!S.profile) return;
    $("#setName").value = S.profile.display_name || "";
    $("#setHandle").value = S.profile.handle || "";
    $("#setProg").value = S.profile.programme || "";
    $("#setSchool").value = S.profile.school || "";
    $("#setUni").value = S.profile.university || "";
    $("#setPublic").checked = !!S.profile.is_public;
    $("#setError").textContent = "";
    updatePublicLink();
    openDialog("settingsDialog");
  }

  function updatePublicLink() {
    const h = $("#setHandle").value.trim().toLowerCase();
    const box = $("#publicLink");
    if (!h) { box.textContent = "Choose a handle to get a shareable link."; return; }
    const url = location.origin + location.pathname + "?u=" + encodeURIComponent(h);
    box.innerHTML = $("#setPublic").checked
      ? 'Public link: <span class="mono">' + esc(url) + "</span>"
      : 'Private — the link <span class="mono">' + esc(url) + "</span> stays locked until you turn this on.";
  }

  async function submitSettings(e) {
    e.preventDefault();
    const err = $("#setError");
    err.textContent = "";
    const btn = $("#settingsForm").querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const patch = {
        display_name: $("#setName").value.trim() || "Student",
        handle: $("#setHandle").value.trim(),
        programme: $("#setProg").value.trim(),
        school: $("#setSchool").value.trim(),
        university: $("#setUni").value.trim(),
        is_public: $("#setPublic").checked
      };
      await Store.saveProfile(S.user.id, patch);
      S.profile = Object.assign({}, S.profile, patch);
      closeDialog($("#settingsDialog"));
      renderAll();
      toast("Details saved");
    } catch (ex) {
      err.textContent = ex.message || "Could not save.";
    } finally {
      btn.disabled = false;
    }
  }

  async function signOut() {
    await Store.signOut();
    closeDialog($("#settingsDialog"));
    S.user = null; S.profile = null; S.semesters = []; S.canEdit = false; S.editing = false; S.draft = null;
    await boot();
    toast("Signed out");
  }

  /* ---------------- render everything ---------------- */
  function renderAll() {
    S.record = computeRecord(S.editing ? S.draft : S.semesters);
    document.body.dataset.view = S.view;
    renderHero();
    renderAuthArea();
    renderBanner();
    renderSemesters();
    renderChart();
    updatePlanner();
    updateCalc();
    $("#footStatus").innerHTML = S.view === "public"
      ? "Public record · @" + esc(S.profile.handle || "")
      : (S.user ? "Signed in as " + esc(S.user.email) : "Demo record");
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    const params = new URLSearchParams(location.search);
    const handle = params.get("u");

    try {
      if (handle) {
        const pub = await Store.publicRecord(handle);
        if (!pub) {
          S.view = "landing";
          S.profile = PROFILE;
          S.semesters = SEMESTERS;
          S.canEdit = false;
          renderAll();
          toast("No public record at @" + handle);
          return;
        }
        S.view = "public";
        S.profile = pub.profile;
        S.semesters = pub.semesters;
        S.canEdit = false;
        renderAll();
        return;
      }

      const user = await Store.session();
      if (user) {
        S.user = user;
        S.profile = (await Store.profile(user.id)) || { display_name: user.email, handle: "", is_public: false };
        S.semesters = await Store.record(user.id);
        S.view = "app";
        S.canEdit = true;
      } else {
        S.user = null;
        S.profile = PROFILE;
        S.semesters = SEMESTERS;
        S.view = "landing";
        S.canEdit = false;
      }
    } catch (e) {
      console.error(e);
      S.view = "landing";
      S.profile = PROFILE;
      S.semesters = SEMESTERS;
      S.canEdit = false;
      toast("Could not load your record: " + e.message);
    }
    renderAll();
  }

  /* ---------------- wiring ---------------- */
  function init() {
    paintTheme(document.documentElement.dataset.theme || "light");
    renderScale();
    renderResources();
    buildPresets();
    buildGaugeTicks();
    calcRows = loadCalc();
    renderCalcRows();

    $("#authForm").addEventListener("submit", submitAuth);
    $("#settingsForm").addEventListener("submit", submitSettings);
    $("#signOutBtn").addEventListener("click", signOut);
    $$("#authDialog .tab").forEach((b) => b.addEventListener("click", () => setAuthTab(b.dataset.tab)));
    $("#setHandle").addEventListener("input", updatePublicLink);
    $("#setPublic").addEventListener("change", updatePublicLink);

    $("#editBar").addEventListener("click", (e) => {
      if (e.target.id === "saveEdit") saveEdit();
      else if (e.target.id === "cancelEdit") cancelEdit();
      else if (e.target.id === "addSemester") { addSemesterToDraft(); renderSemesters(); }
    });
    $("#emptyAdd").addEventListener("click", () => { if (S.canEdit) startEdit(); else openAuth("up"); });

    $("#presetRow").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (b) setPreset(b.dataset.preset);
    });
    $("#addRow").addEventListener("click", () => {
      calcRows.push(blankRow()); saveCalc(); renderCalcRows(calcRows.length - 1); updateCalc();
    });
    $("#toPlanner").addEventListener("click", () => {
      if (calcSnapshot) { $("#targetCredits").value = calcSnapshot.credits; updatePlanner(); toast("Gauge set to " + calcSnapshot.credits + " credits"); }
      document.getElementById("planner").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    ["#targetCgpa", "#targetCredits"].forEach((sel) => {
      $(sel).addEventListener("input", updatePlanner);
      $(sel).addEventListener("change", updatePlanner);
    });
    $("#quickTargets").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      $("#targetCgpa").value = b.dataset.target;
      updatePlanner();
      $$("#quickTargets .chip").forEach((c) => c.classList.toggle("is-active", c === b));
    });

    $("#copyBtn").addEventListener("click", () => {
      const R = S.record;
      if (!R.credits) { toast("No record to copy yet"); return; }
      const text = "CGPA " + f2(R.cgpa) + " / 10 · " + R.credits + " credits";
      const done = () => toast("Copied — " + f2(R.cgpa) + " CGPA");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      else fallbackCopy(text, done);
    });

    const bar = $(".topbar");
    const onScroll = () => bar.classList.toggle("is-stuck", window.scrollY > 6);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", () => closeTips(), { passive: true });
    onScroll();

    if ("IntersectionObserver" in window) {
      const railLinks = $$(".rail a");
      const byId = {};
      railLinks.forEach((a) => { byId[a.dataset.rail] = a; });
      const secObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            railLinks.forEach((a) => a.classList.remove("is-on"));
            if (byId[e.target.id]) byId[e.target.id].classList.add("is-on");
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      ["semesters", "trend", "calculator", "planner", "scale", "resources"].forEach((id) => {
        const n = document.getElementById(id);
        if (n) secObserver.observe(n);
      });

      const trend = document.getElementById("trend");
      if (trend && !REDUCED) {
        const drawObs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !chartAnimated) { chartAnimated = true; animateLine($("#chartHost")); drawObs.disconnect(); }
          });
        }, { threshold: 0.25 });
        drawObs.observe(trend);
      }
    }

    observeReveals();
    boot();

    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderChart, 180); });
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Copy not available"); }
    document.body.removeChild(ta);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
