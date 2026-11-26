/* ============================================================
   GPA Ledger — behaviour
   Every number is derived from SEMESTERS in data.js
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
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- core maths ---------------- */
  function semStats(sem) {
    let credits = 0, points = 0;
    sem.courses.forEach((c) => {
      const cr = num(c.credits);
      credits += cr;
      points += cr * pointOf(c.grade);
    });
    return { credits, points, gpa: credits > 0 ? points / credits : 0 };
  }

  const RECORD = (function () {
    const rows = SEMESTERS.map((s) => Object.assign({ meta: s }, semStats(s)));
    const credits = rows.reduce((a, r) => a + r.credits, 0);
    const points = rows.reduce((a, r) => a + r.points, 0);
    return { rows, credits, points, cgpa: credits > 0 ? points / credits : 0 };
  })();

  /* ---------------- theme ---------------- */
  const THEME_KEY = "gpahub.theme";
  const themeBtn = $("#themeBtn");

  function paintTheme(t) {
    document.documentElement.dataset.theme = t;
    themeBtn.setAttribute("aria-checked", t === "dark" ? "true" : "false");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#12130d" : "#f4efe4");
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  (function initTheme() {
    let t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!t) t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    paintTheme(t);
  })();
  themeBtn.addEventListener("click", () => {
    paintTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  /* ---------------- small helpers ---------------- */
  function countUp(node, to, decimals, suffix) {
    suffix = suffix || "";
    if (REDUCED || !node) { if (node) node.textContent = to.toFixed(decimals) + suffix; return; }
    const dur = 900, t0 = performance.now();
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
    toast._t = setTimeout(() => t.classList.remove("is-on"), 2200);
  }

  /* ---------------- hero ---------------- */
  function renderHero() {
    $("#heroName").textContent = PROFILE.display;
    $("#heroPrn").textContent = PROFILE.prn;
    $("#heroProg").textContent = PROFILE.programme;
    $("#heroSchool").textContent = PROFILE.school;
    $("#heroUni").textContent = PROFILE.university;
    $("#heroDate").textContent = PROFILE.transcriptDate;
    $("#footDate").textContent = PROFILE.transcriptDate;

    countUp($("#cgpaValue"), RECORD.cgpa, 2);
    countUp($("#statCredits"), RECORD.credits, 0);
    countUp($("#statSems"), RECORD.rows.length, 0);
    countUp($("#statPct"), RECORD.cgpa * 10, 2, "%");
    countUp($("#statBest"), Math.max.apply(null, RECORD.rows.map((r) => r.gpa)), 2);

    // engraved progress ring around the seal
    const ring = $("#ringFill");
    const r = parseFloat(ring.getAttribute("r"));
    const C = 2 * Math.PI * r;
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C;
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = C * (1 - Math.min(RECORD.cgpa, 10) / 10);
    });
  }

  /* ---------------- semester cards ---------------- */
  function renderSemesters() {
    const host = $("#semGrid");
    host.innerHTML = "";
    RECORD.rows.forEach((r) => {
      const card = el("article", "card sem-card reveal");
      const head = el("div", "sem-head");
      head.appendChild(el("div", "",
        '<h3 class="sem-title">' + r.meta.label + '</h3>' +
        '<p class="sem-year">Academic year ' + r.meta.year + "</p>"));
      head.appendChild(el("div", "sem-score",
        '<span class="sem-gpa">' + f2(r.gpa) + "</span>" +
        '<span class="sem-credits">' + r.credits + " credits</span>"));
      card.appendChild(head);

      const table = el("table", "sem-table");
      table.innerHTML = "<thead><tr><th>Course</th><th class=\"num\">Credits</th><th>Grade</th></tr></thead>";
      const tb = el("tbody");
      r.meta.courses.forEach((c) => {
        const p = pointOf(c.grade);
        tb.appendChild(el("tr", "",
          "<td>" + c.name + '<span class="c-code">' + c.code + "</span></td>" +
          '<td class="num">' + num(c.credits).toFixed(1) + "</td>" +
          '<td><span class="pill g-' + p + '">' + c.grade + "</span></td>"));
      });
      table.appendChild(tb);
      card.appendChild(table);
      host.appendChild(card);
    });
    observeReveals(host);
  }

  /* ---------------- grading scale ---------------- */
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

  /* ---------------- resources ---------------- */
  function renderResources() {
    const host = $("#resGrid");
    host.innerHTML = "";
    RESOURCES.forEach((group) => {
      const col = el("div", "res-col");
      col.appendChild(el("h3", "", group.title));
      const ul = el("ul", "res-list");
      group.items.forEach((it) => {
        const a = el("a", "res-link");
        a.href = it.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.innerHTML = '<span class="res-name">' + it.name + "</span>" +
                      '<span class="res-note">' + it.note + "</span>" +
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

  function renderChart() {
    const host = $("#chartHost");
    const cw = Math.max(300, Math.round(host.clientWidth || 760));
    const narrow = cw < 560;
    const W = Math.min(760, cw);
    const H = narrow ? 260 : 310;
    const m = narrow ? { t: 30, r: 18, b: 38, l: 30 } : { t: 34, r: 34, b: 46, l: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const sems = RECORD.rows.map((r, i) => {
      let c = 0, p = 0;
      for (let k = 0; k <= i; k++) { c += RECORD.rows[k].credits; p += RECORD.rows[k].points; }
      return {
        label: "Sem " + (i + 1),
        gpa: r.gpa,
        cgpa: c > 0 ? p / c : 0,
        credits: r.credits,
        courses: r.meta.courses.length
      };
    });

    const pts = sems.slice();
    if (projection) pts.push({ label: "Next", gpa: projection.value, cgpa: projection.cgpa, ghost: true, credits: null });

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
        if (i > 0) dashed += " M " + x(i - 1).toFixed(1) + " " + y(pts[i - 1].gpa).toFixed(1) +
          " L " + x(i).toFixed(1) + " " + y(p.gpa).toFixed(1);
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
      svg.push('<circle class="pt" data-i="' + i + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (narrow ? 4.5 : 5.5) + '" fill="' + col + '" stroke="var(--paper-raise)" stroke-width="2"/>');
      svg.push('<text class="val-label' + (p.ghost ? " val-label-ghost" : "") + '" style="font-size:' + (narrow ? 11 : 12) + 'px" x="' + cx.toFixed(1) + '" y="' + (cy - 12).toFixed(1) + '" text-anchor="middle">' + f2(p.gpa) + "</text>");
      svg.push('<circle cx="' + cx.toFixed(1) + '" cy="' + y(p.cgpa).toFixed(1) + '" r="3.4" fill="var(--forest)"/>');
      svg.push('<text class="x-label" style="font-size:' + (narrow ? 10.5 : 11) + 'px" x="' + cx.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + p.label + "</text>");
      hot.push({ i, cx, cy, p });
    });

    hot.forEach((h) => {
      const p = h.p;
      const body = p.ghost
        ? '<p class="tip-title">Projected</p><p class="tip-row"><span>SGPA needed</span><b>' + f2(p.gpa) + "</b></p>" +
          '<p class="tip-row"><span>CGPA then</span><b>' + f2(p.cgpa) + "</b></p>"
        : '<p class="tip-title">' + p.label + "</p>" +
          '<p class="tip-row"><span>SGPA</span><b>' + f2(p.gpa) + "</b></p>" +
          '<p class="tip-row"><span>CGPA</span><b>' + f2(p.cgpa) + "</b></p>" +
          '<p class="tip-row"><span>Credits</span><b>' + p.credits + "</b></p>" +
          '<p class="tip-row"><span>Courses</span><b>' + p.courses + "</b></p>";
      svg.push('<circle class="hit" data-tip="' + encodeURIComponent(body) + '" cx="' + h.cx.toFixed(1) + '" cy="' + h.cy.toFixed(1) + '" r="20" tabindex="0" role="button" aria-label="' +
        (p.ghost ? "Projected semester" : p.label + ", SGPA " + f2(p.gpa)) + '"/>');
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
      let left = x - r.width / 2;
      let top = y - r.height - 14;
      left = clamp(left, 8, window.innerWidth - r.width - 8);
      if (top < 8) top = y + 18;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }
    function open(node, x, y) {
      tip.innerHTML = decodeURIComponent(node.dataset.tip);
      tip.hidden = false;
      place(x, y);
      const dot = host.querySelector('.pt[data-i="' + node.dataset.i + '"]');
      if (dot) dot.classList.add("is-hot");
    }
    function close() {
      tip.hidden = true;
      $$(".pt.is-hot", host).forEach((d) => d.classList.remove("is-hot"));
    }
    $$(".hit", host).forEach((node) => {
      node.addEventListener("pointerenter", (e) => open(node, e.clientX, e.clientY));
      node.addEventListener("pointermove", (e) => place(e.clientX, e.clientY));
      node.addEventListener("pointerleave", close);
      node.addEventListener("pointerdown", (e) => open(node, e.clientX, e.clientY));
      node.addEventListener("focus", () => {
        const b = node.getBoundingClientRect();
        open(node, b.left + b.width / 2, b.top);
      });
      node.addEventListener("blur", close);
    });
    closeTips = close;
  }
  let closeTips = function () {};

  /* ---------------- calculator ---------------- */
  const CALC_KEY = "gpahub.calc.v2";
  let calcRows = [];
  let calcSnapshot = null;
  let lastSgpa = null;

  function blankRow() { return { name: "", credits: 0, grade: "O" }; }

  function loadCalc() {
    try {
      const raw = localStorage.getItem(CALC_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return [blankRow()];
  }
  function saveCalc() {
    try { localStorage.setItem(CALC_KEY, JSON.stringify(calcRows)); } catch (e) {}
  }

  function gradeOptions(selected) {
    return GRADE_SCALE.map((g) =>
      '<option value="' + g.g + '"' + (g.g === selected ? " selected" : "") + ">" + g.g + "</option>"
    ).join("");
  }

  function renderCalcRows(newIndex) {
    const body = $("#calcBody");
    body.innerHTML = "";
    calcRows.forEach((row, i) => {
      const tr = el("tr", i === newIndex ? "is-new" : "");

      const tdName = el("td");
      const inpName = el("input");
      inpName.type = "text";
      inpName.value = row.name;
      inpName.placeholder = "Course name";
      inpName.setAttribute("aria-label", "Course name");
      inpName.addEventListener("input", (e) => { calcRows[i].name = e.target.value; saveCalc(); });
      tdName.appendChild(inpName);

      const tdCr = el("td");
      const inpCr = el("input");
      inpCr.type = "number";
      inpCr.min = "0"; inpCr.max = "20"; inpCr.step = "1";
      inpCr.value = row.credits;
      inpCr.setAttribute("aria-label", "Credits");
      inpCr.addEventListener("input", (e) => {
        calcRows[i].credits = num(e.target.value);
        saveCalc();
        updateCalc();
      });
      tdCr.appendChild(inpCr);

      const tdGr = el("td");
      const selGr = el("select");
      selGr.innerHTML = gradeOptions(row.grade);
      selGr.setAttribute("aria-label", "Grade");
      selGr.addEventListener("change", (e) => {
        calcRows[i].grade = e.target.value;
        saveCalc();
        updateCalc();
      });
      tdGr.appendChild(selGr);

      const tdPts = el("td", "pts", String(pointOf(row.grade)));

      const tdDel = el("td");
      const del = el("button", "row-del", "&times;");
      del.type = "button";
      del.title = "Remove course";
      del.setAttribute("aria-label", "Remove course");
      del.addEventListener("click", () => {
        calcRows.splice(i, 1);
        if (!calcRows.length) calcRows.push(blankRow());
        saveCalc();
        renderCalcRows();
        updateCalc();
      });
      tdDel.appendChild(del);

      tr.append(tdName, tdCr, tdGr, tdPts, tdDel);
      body.appendChild(tr);
    });
  }

  function updateCalc() {
    const st = semStats({ courses: calcRows });
    const has = st.credits > 0;
    const sgpaText = has ? f2(st.gpa) : "—";

    const sgpaEl = $("#calcSgpa");
    if (sgpaEl.textContent !== sgpaText && sgpaText !== "—" && !REDUCED) {
      sgpaEl.classList.remove("pop");
      void sgpaEl.offsetWidth;
      sgpaEl.classList.add("pop");
    }
    sgpaEl.textContent = sgpaText;

    $("#calcCredits").textContent = st.credits;
    $("#calcPoints").textContent = Math.round(st.points * 100) / 100;

    const newCredits = RECORD.credits + st.credits;
    const newCgpa = newCredits > 0 ? (RECORD.points + st.points) / newCredits : 0;
    $("#calcNewCgpa").textContent = has ? f2(newCgpa) : "—";

    const deltaEl = $("#calcDelta");
    deltaEl.classList.remove("up", "down");
    if (!has) {
      deltaEl.textContent = "Add courses to see the effect.";
    } else {
      const rd = Math.round((newCgpa - RECORD.cgpa) * 100) / 100;
      if (rd === 0) {
        deltaEl.textContent = "• No change — stays at " + f2(RECORD.cgpa) + " over " + newCredits + " credits";
      } else {
        deltaEl.textContent = (rd > 0 ? "▲ +" : "▼ −") + f2(Math.abs(rd)) +
          " vs current " + f2(RECORD.cgpa) + " over " + newCredits + " credits";
        deltaEl.classList.add(rd > 0 ? "up" : "down");
      }
    }
    calcSnapshot = has ? { credits: st.credits, sgpa: st.gpa } : null;
    lastSgpa = st.gpa;
  }

  function setPreset(kind) {
    if (kind === "blank") {
      calcRows = [blankRow()];
    } else {
      const sem = SEMESTERS[parseInt(kind, 10)];
      calcRows = sem.courses.map((c) => ({ name: c.name, credits: c.credits, grade: c.grade }));
    }
    saveCalc();
    renderCalcRows();
    updateCalc();
    $$("#presetRow .chip").forEach((b) => b.classList.toggle("is-active", b.dataset.preset === kind));
  }

  function buildPresets() {
    const row = $("#presetRow");
    SEMESTERS.forEach((s, i) => {
      const b = el("button", "chip", s.label);
      b.type = "button";
      b.dataset.preset = String(i);
      row.appendChild(b);
    });
  }

  /* ---------------- gauge / planner ---------------- */
  function buildGaugeTicks() {
    const g = $("#gaugeTicks");
    let out = "";
    for (let v = 6; v <= 10.0001; v += 0.5) {
      const t = (v - 6) / 4;
      const a = (-90 + t * 180) * Math.PI / 180;
      const major = Math.abs(v - Math.round(v)) < 1e-6;
      const r1 = 120, r2 = major ? 132 : 128;
      const x1 = 150 + r1 * Math.sin(a), y1 = 165 - r1 * Math.cos(a);
      const x2 = 150 + r2 * Math.sin(a), y2 = 165 - r2 * Math.cos(a);
      out += '<line class="gauge-tick' + (major ? " major" : "") + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
      if (major) {
        const lx = 150 + 138 * Math.sin(a), ly = 165 - 138 * Math.cos(a);
        out += '<text class="gauge-tick-label" x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) +
          '" text-anchor="middle">' + v.toFixed(0) + "</text>";
      }
    }
    g.innerHTML = out;
  }

  function setSliderFill(input) {
    const min = num(input.min), max = num(input.max);
    const pct = ((num(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--fill", pct.toFixed(1) + "%");
  }

  function updatePlanner() {
    const tEl = $("#targetCgpa");
    const cEl = $("#targetCredits");
    const T = clamp(num(tEl.value), 6, 10);
    const N = clamp(Math.round(num(cEl.value)), 1, 40);

    $("#targetCgpaOut").textContent = T.toFixed(2);
    $("#targetCreditsOut").textContent = String(N);
    setSliderFill(tEl);
    setSliderFill(cEl);
    $("#plannerBase").textContent = RECORD.credits + " credits · " + Math.round(RECORD.points * 100) / 100 + " points";

    const need = (T * (RECORD.credits + N) - RECORD.points) / N;
    const best = (RECORD.points + 10 * N) / (RECORD.credits + N);

    $("#needSgpa").textContent = need > 10 ? "10.00+" : f2(Math.max(0, need));
    $("#bestCgpa").textContent = f2(best);

    const verdict = $("#needVerdict");
    verdict.classList.remove("up", "down");
    if (need > 10) {
      verdict.textContent = "Not reachable in one semester. Even a perfect 10.00 SGPA gets you to " + f2(best) + ".";
      verdict.classList.add("down");
      projection = null;
    } else if (need <= 0) {
      verdict.textContent = "Already secure — any SGPA this semester keeps you at or above " + f2(T) + ".";
      verdict.classList.add("up");
      projection = { value: clamp(need, 0, 10), cgpa: best };
    } else {
      verdict.textContent = "Reachable — that is " + f2(need * 10) + "% equivalent. You averaged " + f2(RECORD.cgpa) + " so far.";
      verdict.classList.add("up");
      projection = { value: need, cgpa: T };
    }

    // needle + live arc
    const shown = clamp(need, 6, 10);
    const t = (shown - 6) / 4;
    $("#gaugeNeedle").style.transform = "rotate(" + (-90 + t * 180).toFixed(2) + "deg)";

    const arc = $("#gaugeArc");
    if (arc.getTotalLength) {
      const len = arc.getTotalLength();
      arc.style.strokeDasharray = len;
      arc.style.strokeDashoffset = len * (1 - t);
    }
    arc.classList.toggle("is-over", need > 10);

    // your current CGPA marker
    const cur = clamp(RECORD.cgpa, 6, 10);
    const ca = (-90 + ((cur - 6) / 4) * 180) * Math.PI / 180;
    const mk = $("#gaugeMarker");
    mk.setAttribute("x1", (150 + 128 * Math.sin(ca)).toFixed(1));
    mk.setAttribute("y1", (165 - 128 * Math.cos(ca)).toFixed(1));
    mk.setAttribute("x2", (150 + 142 * Math.sin(ca)).toFixed(1));
    mk.setAttribute("y2", (165 - 142 * Math.cos(ca)).toFixed(1));

    renderChart();
  }

  /* ---------------- scroll behaviour ---------------- */
  const revealObserver = ("IntersectionObserver" in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            revealObserver.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })
    : null;

  function observeReveals(root) {
    $$(".reveal", root || document).forEach((n) => {
      if (revealObserver) revealObserver.observe(n);
      else n.classList.add("is-in");
    });
  }

  function wireScroll() {
    const bar = $(".topbar");
    const onScroll = () => bar.classList.toggle("is-stuck", window.scrollY > 6);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", () => closeTips(), { passive: true });
    onScroll();

    if (!("IntersectionObserver" in window)) return;
    const railLinks = $$(".rail a");
    const byId = {};
    railLinks.forEach((a) => { byId[a.dataset.rail] = a; });
    const secObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          railLinks.forEach((a) => a.classList.remove("is-on"));
          const link = byId[e.target.id];
          if (link) link.classList.add("is-on");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["semesters", "trend", "calculator", "planner", "scale", "resources"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) secObserver.observe(node);
    });

    const trend = document.getElementById("trend");
    if (trend && !REDUCED) {
      const drawObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !chartAnimated) {
            chartAnimated = true;
            animateLine($("#chartHost"));
            drawObs.disconnect();
          }
        });
      }, { threshold: 0.25 });
      drawObs.observe(trend);
    }
  }

  /* ---------------- wiring ---------------- */
  function init() {
    renderHero();
    renderSemesters();
    renderScale();
    renderResources();

    buildPresets();
    buildGaugeTicks();
    calcRows = loadCalc();
    renderCalcRows();
    updateCalc();

    $("#presetRow").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (b) setPreset(b.dataset.preset);
    });

    $("#addRow").addEventListener("click", () => {
      calcRows.push(blankRow());
      saveCalc();
      renderCalcRows(calcRows.length - 1);
      updateCalc();
    });

    $("#toPlanner").addEventListener("click", () => {
      if (calcSnapshot) {
        $("#targetCredits").value = calcSnapshot.credits;
        updatePlanner();
        toast("Gauge set to " + calcSnapshot.credits + " credits");
      }
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

    $("#printBtn").addEventListener("click", () => window.print());

    $("#copyBtn").addEventListener("click", () => {
      const text = "CGPA " + f2(RECORD.cgpa) + " / 10 · " + RECORD.credits + " credits · " + PROFILE.university;
      const done = () => toast("Copied — " + f2(RECORD.cgpa) + " CGPA");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    });

    updatePlanner();
    observeReveals();
    wireScroll();

    let rt = null;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(renderChart, 180);
    });
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Copy not available"); }
    document.body.removeChild(ta);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
