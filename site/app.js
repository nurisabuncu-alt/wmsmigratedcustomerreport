(function () {
  var charts = [];

  function fmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }
  function num(n) {
    return n === 0 ? "-" : n.toLocaleString();
  }
  function pctChange(curr, prev) {
    if (!prev) return 0;
    return (100 * (curr - prev)) / prev;
  }
  function fmtPct(n) {
    var r = n.toFixed(1);
    return n > 0 ? "+" + r + "%" : r + "%";
  }
  function peakIn(values, a, b) {
    var m = 0;
    for (var i = a; i <= b; i++) if (values[i] > m) m = values[i];
    return m;
  }
  function alignedYoy(values, from, to) {
    var curr = 0, prev = 0;
    for (var i = from; i <= to; i++) {
      if (i - 12 >= 0) {
        curr += values[i];
        prev += values[i - 12];
      }
    }
    return pctChange(curr, prev);
  }

  function quarterOf(monthKey) {
    var p = monthKey.split("-").map(Number);
    return { year: p[0], q: Math.ceil(p[1] / 3) };
  }

  var ALL_TIME = { value: "all", label: "All time (Jun 2024 - Aug 2026)", from: 0, to: MONTHS.length - 1 };
  var QUARTER_RANGES = [];
  (function buildQuarters() {
    var i = 0;
    while (i < MONTHS.length) {
      var yq = quarterOf(MONTHS[i]);
      var j = i;
      while (j + 1 < MONTHS.length) {
        var next = quarterOf(MONTHS[j + 1]);
        if (next.year !== yq.year || next.q !== yq.q) break;
        j += 1;
      }
      var names = MONTHS.slice(i, j + 1).map(function (m) { return MONTH_NAMES[Number(m.slice(5)) - 1]; });
      var span = names.length === 1 ? names[0] : names[0] + " - " + names[names.length - 1];
      var partial = j - i + 1 < 3;
      QUARTER_RANGES.push({
        value: "q" + yq.q + "-" + yq.year,
        label: partial ? "Q" + yq.q + " " + yq.year + " (" + span + ", partial)" : "Q" + yq.q + " " + yq.year + " (" + span + ")",
        from: i,
        to: j,
      });
      i = j + 1;
    }
  })();
  var MONTH_RANGES = MONTHS.map(function (m, i) {
    return { value: m, label: MONTH_LABELS[i], from: i, to: i };
  });

  function resolvePeriod(quarter, month) {
    if (month !== "none") {
      return MONTH_RANGES.find(function (r) { return r.value === month; }) || ALL_TIME;
    }
    if (quarter === "all" || quarter === "none") return ALL_TIME;
    return QUARTER_RANGES.find(function (r) { return r.value === quarter; }) || ALL_TIME;
  }

  function periodTotals(rows, from, to) {
    var byKey = {};
    rows.forEach(function (row) {
      var key = row.db + "|" + row.company;
      var created = sumRange(row.created, from, to);
      var shipped = sumRange(row.shipped, from, to);
      if (!byKey[key]) {
        byKey[key] = { db: row.db, company: row.company, created: created, shipped: shipped, clientMonths: row.clients.slice() };
      } else {
        byKey[key].created += created;
        byKey[key].shipped += shipped;
        for (var i = 0; i < byKey[key].clientMonths.length; i++) byKey[key].clientMonths[i] += row.clients[i];
      }
    });
    return Object.keys(byKey).map(function (k) {
      var r = byKey[k];
      var clientsPeak = 0;
      for (var i = from; i <= to; i++) if (r.clientMonths[i] > clientsPeak) clientsPeak = r.clientMonths[i];
      return {
        db: r.db,
        company: r.company,
        created: r.created,
        shipped: r.shipped,
        fill: r.created === 0 ? 0 : (100 * r.shipped) / r.created,
        clientsPeak: clientsPeak,
      };
    }).filter(function (r) { return r.created > 0 || r.shipped > 0; })
      .sort(function (a, b) { return b.shipped - a.shipped; });
  }

  function companyShippedInRange(rows, from, to) {
    var map = {};
    rows.forEach(function (row) {
      map[row.company] = (map[row.company] || 0) + sumRange(row.shipped, from, to);
    });
    return map;
  }
  function companyPeakClients(rows, from, to) {
    var months = {};
    rows.forEach(function (row) {
      if (!months[row.company]) months[row.company] = row.clients.slice();
      else for (var i = 0; i < months[row.company].length; i++) months[row.company][i] += row.clients[i];
    });
    var peaks = {};
    Object.keys(months).forEach(function (company) {
      var peak = 0;
      for (var i = from; i <= to; i++) if (months[company][i] > peak) peak = months[company][i];
      peaks[company] = peak;
    });
    return peaks;
  }
  function companyMovers(rows, currFrom, currTo) {
    var prevFrom = currFrom - 12;
    var prevTo = currTo - 12;
    if (prevFrom < 0) return { decliners: [], growers: [] };
    var curr = companyShippedInRange(rows, currFrom, currTo);
    var prev = companyShippedInRange(rows, prevFrom, prevTo);
    var clients = companyPeakClients(rows, currFrom, currTo);
    var names = {};
    Object.keys(curr).concat(Object.keys(prev)).forEach(function (n) { names[n] = true; });
    var movers = [];
    Object.keys(names).forEach(function (company) {
      var c = curr[company] || 0;
      var p = prev[company] || 0;
      if (c + p < 1000) return;
      movers.push({ company: company, prev: p, curr: c, yoy: pctChange(c, p), clients: clients[company] || 0 });
    });
    var decliners = movers.filter(function (m) { return m.curr > 0 && m.yoy < 0; })
      .sort(function (a, b) { return (b.prev - b.curr) - (a.prev - a.curr); }).slice(0, 8);
    var growers = movers.filter(function (m) { return m.curr > 0 && m.yoy > 0; })
      .sort(function (a, b) { return b.yoy - a.yoy; }).slice(0, 8);
    return { decliners: decliners, growers: growers };
  }

  var COMPANY_TOTALS = (function () {
    var byKey = {};
    COMPANIES.forEach(function (row) {
      var company = entityCompany(row);
      var key = row.db + "|" + company;
      if (!byKey[key]) byKey[key] = { db: row.db, company: company, created: row.created, shipped: row.shipped };
      else {
        byKey[key].created += row.created;
        byKey[key].shipped += row.shipped;
      }
    });
    return Object.keys(byKey).map(function (k) {
      var r = byKey[k];
      r.fill = r.created === 0 ? 0 : (100 * r.shipped) / r.created;
      return r;
    }).sort(function (a, b) { return b.shipped - a.shipped; });
  })();

  var FLEXPORT_TTM = (function () {
    var shipped = seriesSum(ENTITIES.filter(function (r) { return r.company === "Flexport"; }), "shipped");
    return { prev: sumRange(shipped, 3, 14), curr: sumRange(shipped, 15, 26) };
  })();

  var CONT_TTM_PREV_CREATED = sumRange(CONT_CREATED, 3, 14);
  var CONT_TTM_CURR_CREATED = sumRange(CONT_CREATED, 15, 26);
  var CONT_TTM_PREV_SHIPPED = sumRange(CONT_SHIPPED, 3, 14);
  var CONT_TTM_CURR_SHIPPED = sumRange(CONT_SHIPPED, 15, 26);
  var CONT_TTM_YOY_CREATED = pctChange(CONT_TTM_CURR_CREATED, CONT_TTM_PREV_CREATED);
  var CONT_TTM_YOY_SHIPPED = pctChange(CONT_TTM_CURR_SHIPPED, CONT_TTM_PREV_SHIPPED);
  var CONT_TTM_PREV_FILL = (100 * CONT_TTM_PREV_SHIPPED) / CONT_TTM_PREV_CREATED;
  var CONT_TTM_CURR_FILL = (100 * CONT_TTM_CURR_SHIPPED) / CONT_TTM_CURR_CREATED;
  var CONT_LAST_FULL_YOY_SHIPPED = pctChange(CONT_SHIPPED[26], CONT_SHIPPED[14]);
  var CONT_LAST_FULL_YOY_CREATED = pctChange(CONT_CREATED[26], CONT_CREATED[14]);

  var state = {
    tab: "dashboard",
    db: "all",
    company: "all",
    quarter: "all",
    month: "none",
    dsDb: "all",
    dsCompany: "all",
    dsClient: "all",
  };

  function destroyCharts() {
    charts.forEach(function (c) { c.destroy(); });
    charts = [];
  }
  function addChart(canvas, config) {
    charts.push(new Chart(canvas, config));
  }
  function lineOrBar(labels, datasets) {
    var type = labels.length < 2 ? "bar" : "line";
    return {
      type: type,
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: { y: { beginAtZero: true } },
      },
    };
  }
  function hBar(labels, datasets, suffix) {
    return {
      type: "bar",
      data: { labels: labels, datasets: datasets },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: { x: { beginAtZero: true, ticks: suffix ? { callback: function (v) { return v + suffix; } } : {} } },
      },
    };
  }

  function sel(id, value, opts, onChange) {
    var s = document.createElement("select");
    s.id = id;
    opts.forEach(function (o) {
      var op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      if (o.value === value) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onChange(s.value); });
    return s;
  }
  function labeled(text, el) {
    var wrap = document.createElement("span");
    var lab = document.createElement("label");
    lab.textContent = text;
    wrap.appendChild(lab);
    wrap.appendChild(el);
    return wrap;
  }
  function stat(value, label, tone) {
    var d = document.createElement("div");
    d.className = "stat" + (tone === "bad" ? " bad" : tone === "ok" ? " ok" : "");
    d.innerHTML = '<div class="v"></div><div class="l"></div>';
    d.querySelector(".v").textContent = value;
    d.querySelector(".l").textContent = label;
    return d;
  }
  function table(headers, rows, alignRightFrom) {
    var t = document.createElement("table");
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");
    headers.forEach(function (h, i) {
      var th = document.createElement("th");
      th.textContent = h;
      if (i >= alignRightFrom) th.className = "num";
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    t.appendChild(thead);
    var tb = document.createElement("tbody");
    rows.forEach(function (row) {
      var r = document.createElement("tr");
      row.forEach(function (cell, i) {
        var td = document.createElement("td");
        td.textContent = cell;
        if (i >= alignRightFrom) td.className = "num";
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
    t.appendChild(tb);
    return t;
  }

  function renderDashboard(root) {
    var selectedRange = resolvePeriod(state.quarter, state.month);
    var from = selectedRange.from, to = selectedRange.to;
    var monthLabels = MONTH_LABELS.slice(from, to + 1);
    var inDatabase = state.db === "all" ? COMPANY_TOTALS : COMPANY_TOTALS.filter(function (r) { return r.db === state.db; });
    var companyOptions = inDatabase.map(function (r) { return r.company; });
    if (state.company !== "all" && companyOptions.indexOf(state.company) < 0) state.company = "all";

    var scopeEntities = ENTITIES.slice();
    if (state.db !== "all") scopeEntities = scopeEntities.filter(function (r) { return r.db === state.db; });
    if (state.company !== "all") scopeEntities = scopeEntities.filter(function (r) { return r.company === state.company; });

    var filtered = periodTotals(scopeEntities, from, to);
    var scopeCreated = seriesSum(scopeEntities, "created");
    var scopeShipped = seriesSum(scopeEntities, "shipped");
    var scopeClients = seriesSum(scopeEntities, "clients");
    var chartCreated = scopeCreated.slice(from, to + 1);
    var chartShipped = scopeShipped.slice(from, to + 1);
    var chartClients = scopeClients.slice(from, to + 1);
    var clientsPeak = chartClients.length ? Math.max.apply(null, chartClients) : 0;
    var created = filtered.reduce(function (s, r) { return s + r.created; }, 0);
    var shipped = filtered.reduce(function (s, r) { return s + r.shipped; }, 0);
    var fill = created === 0 ? 0 : (100 * shipped) / created;
    var top = filtered.slice(0, 12);
    var last = scopeCreated.length - 1;
    var isMonth = state.month !== "none";
    var isAllTime = !isMonth && (state.quarter === "all" || state.quarter === "none");
    var scopeYoyCreated = isAllTime ? pctChange(scopeCreated[last], scopeCreated[last - 12]) : alignedYoy(scopeCreated, from, to);
    var scopeYoyShipped = isAllTime ? pctChange(scopeShipped[last], scopeShipped[last - 12]) : alignedYoy(scopeShipped, from, to);
    var priorLen = to - from + 1;
    var priorFrom = from - priorLen;
    var hasPriorPeriod = priorFrom >= 0;
    var scopeSeqCreated = isAllTime
      ? pctChange(scopeCreated[last], scopeCreated[last - 1])
      : hasPriorPeriod ? pctChange(sumRange(scopeCreated, from, to), sumRange(scopeCreated, priorFrom, from - 1)) : 0;
    var scopeSeqShipped = isAllTime
      ? pctChange(scopeShipped[last], scopeShipped[last - 1])
      : hasPriorPeriod ? pctChange(sumRange(scopeShipped, from, to), sumRange(scopeShipped, priorFrom, from - 1)) : 0;
    var yoyLabel = isAllTime ? "YoY (Aug 2026 vs Aug 2025)" : isMonth ? "YoY vs same month last year" : "YoY vs same quarter last year";
    var seqLabel = isAllTime ? "MoM (Aug vs Jul 2026)" : isMonth ? "vs prior month" : "vs prior quarter";
    var clientsYoy = from >= 12 ? pctChange(peakIn(scopeClients, from, to), peakIn(scopeClients, from - 12, to - 12)) : 0;
    var ttmYoy = pctChange(TTM_CURR_SHIPPED, TTM_PREV_SHIPPED);
    var continuingYoy = pctChange(CONTINUING_CURR, CONTINUING_PREV);
    var flexportShareOfDrop = (100 * (FLEXPORT_TTM.prev - FLEXPORT_TTM.curr)) / (TTM_PREV_SHIPPED - TTM_CURR_SHIPPED);
    var scopeLabel = state.company !== "all" && filtered.length === 1 ? state.company : state.db === "all" ? "all databases" : state.db;
    var portfolioView = state.company === "all";
    var moverFrom = isAllTime ? 15 : from;
    var moverTo = isAllTime ? 26 : to;
    var movers = companyMovers(scopeEntities, moverFrom, moverTo);
    var offboardedRows = OFFBOARDED.filter(function (r) {
      return (state.db === "all" || r.db === state.db) && (state.company === "all" || entityCompany(r) === state.company);
    });
    var fillRows = FILL_OUTLIERS.filter(function (r) {
      return (state.db === "all" || r.db === state.db) && (state.company === "all" || r.company === state.company || entityCompany(r) === state.company);
    });

    var dbPeriodMap = {};
    scopeEntities.forEach(function (row) {
      if (!dbPeriodMap[row.db]) {
        dbPeriodMap[row.db] = { created: 0, shipped: 0, clientMonths: row.clients.slice() };
      } else {
        for (var i = 0; i < dbPeriodMap[row.db].clientMonths.length; i++) dbPeriodMap[row.db].clientMonths[i] += row.clients[i];
      }
      dbPeriodMap[row.db].created += sumRange(row.created, from, to);
      dbPeriodMap[row.db].shipped += sumRange(row.shipped, from, to);
    });
    var dbPeriod = Object.keys(dbPeriodMap).map(function (dbName) {
      var r = dbPeriodMap[dbName];
      var clientsPeakDb = 0;
      for (var i = from; i <= to; i++) if (r.clientMonths[i] > clientsPeakDb) clientsPeakDb = r.clientMonths[i];
      return { db: dbName, created: r.created, shipped: r.shipped, clientsPeak: clientsPeakDb };
    }).sort(function (a, b) { return b.shipped - a.shipped; });

    var intro = document.createElement("p");
    intro.className = "lede";
    intro.textContent = "Order created vs shipped for 69 IDs across three servers and seven databases, Jun 2024 - Aug 2026. Test companies excluded. DeliverrLiveDB IDs are Flexport clients, so company-grain views count them once.";
    root.appendChild(intro);
    var pills = document.createElement("div");
    pills.className = "pills";
    ["69 IDs mapped", "40 companies with volume", "57 company/client accounts", "Snapshot, not live"].forEach(function (t) {
      var p = document.createElement("span");
      p.className = "pill";
      p.textContent = t;
      pills.appendChild(p);
    });
    root.appendChild(pills);

    var call = document.createElement("div");
    call.className = "callout";
    call.textContent = "Shipped volume fell " + fmtPct(ttmYoy) + " year over year. Flexport went from " +
      FLEXPORT_TTM.prev.toLocaleString() + " shipped orders in the prior twelve months to " +
      FLEXPORT_TTM.curr.toLocaleString() + ", as 12 of its 18 client accounts stopped producing orders. That is " +
      flexportShareOfDrop.toFixed(0) + "% of the total decline. The remaining " + CONTINUING_COUNT +
      " continuing accounts are down " + fmtPct(continuingYoy) + ".";
    root.appendChild(call);

    var filters = document.createElement("div");
    filters.className = "filters";
    filters.appendChild(labeled("Database", sel("db", state.db, [{ value: "all", label: "All databases" }].concat(DB_TOTALS.map(function (r) { return { value: r.db, label: r.db }; })), function (v) { state.db = v; state.company = "all"; render(); })));
    filters.appendChild(labeled("Company", sel("co", state.company, [{ value: "all", label: "All companies" }].concat(companyOptions.map(function (c) { return { value: c, label: c }; })), function (v) { state.company = v; render(); })));
    filters.appendChild(labeled("Quarter", sel("q", state.month !== "none" ? "none" : state.quarter, [{ value: "none", label: "Not used" }, { value: "all", label: ALL_TIME.label }].concat(QUARTER_RANGES.map(function (r) { return { value: r.value, label: r.label }; })), function (v) {
      if (v === "none") { state.quarter = state.month !== "none" ? "none" : "all"; }
      else { state.quarter = v; state.month = "none"; }
      render();
    })));
    filters.appendChild(labeled("Month", sel("m", state.month, [{ value: "none", label: "Not used" }].concat(MONTH_RANGES.map(function (r) { return { value: r.value, label: r.label }; })), function (v) {
      state.month = v;
      state.quarter = v === "none" ? "all" : "none";
      render();
    })));
    root.appendChild(filters);

    var stats = document.createElement("div");
    stats.className = "stats";
    stats.appendChild(stat(fmt(created), "Orders created (period)"));
    stats.appendChild(stat(fmt(shipped), "Orders shipped (period)"));
    stats.appendChild(stat(fill.toFixed(1) + "%", "Shipped / created"));
    stats.appendChild(stat(String(clientsPeak), "Peak monthly clients"));
    stats.appendChild(stat(fmtPct(scopeYoyCreated), "Created " + yoyLabel, scopeYoyCreated < 0 ? "bad" : "ok"));
    stats.appendChild(stat(fmtPct(scopeYoyShipped), "Shipped " + yoyLabel, scopeYoyShipped < 0 ? "bad" : "ok"));
    if (isAllTime || hasPriorPeriod) {
      stats.appendChild(stat(fmtPct(scopeSeqCreated), "Created " + seqLabel, scopeSeqCreated < 0 ? "bad" : "ok"));
      stats.appendChild(stat(fmtPct(scopeSeqShipped), "Shipped " + seqLabel, scopeSeqShipped < 0 ? "bad" : "ok"));
    }
    stats.appendChild(stat(String(filtered.length), "Companies with volume"));
    stats.appendChild(stat(fmtPct(clientsYoy), "Peak clients YoY", clientsYoy < 0 ? "bad" : "ok"));
    root.appendChild(stats);

    var cap = document.createElement("p");
    cap.className = "muted";
    cap.textContent = "Filters: Database, Company, and either Quarter or Month. August 2026 is a complete month. " + scopeLabel + " | " + selectedRange.label;
    root.appendChild(cap);

    var h2 = document.createElement("h2");
    h2.textContent = (portfolioView ? "All accounts" : state.company) + " - created vs shipped per month";
    root.appendChild(h2);
    var box1 = document.createElement("div");
    box1.className = "chart-box";
    box1.style.height = "280px";
    var c1 = document.createElement("canvas");
    box1.appendChild(c1);
    root.appendChild(box1);
    addChart(c1, lineOrBar(monthLabels, [
      { label: "OrderCreatedCount", data: chartCreated, borderColor: "#0969da", backgroundColor: "rgba(9,105,218,0.15)", tension: 0.2, fill: true },
      { label: "OrderShippedCount", data: chartShipped, borderColor: "#1a7f37", backgroundColor: "rgba(26,127,55,0.15)", tension: 0.2, fill: true },
    ]));
    var box2 = document.createElement("div");
    box2.className = "chart-box";
    box2.style.height = "160px";
    var c2 = document.createElement("canvas");
    box2.appendChild(c2);
    root.appendChild(box2);
    addChart(c2, lineOrBar(monthLabels, [
      { label: "Clients", data: chartClients, borderColor: "#9a6700", backgroundColor: "rgba(154,103,0,0.15)", tension: 0.2, fill: true },
    ]));

    if (state.db === "all" && portfolioView) {
      var hCont = document.createElement("h2");
      hCont.textContent = "Continuing accounts only - created vs shipped per month";
      root.appendChild(hCont);
      var pCont = document.createElement("p");
      pCont.className = "muted";
      pCont.textContent = selectedRange.label + " | " + CONTINUING_COUNT + " accounts still shipping in the latest twelve months.";
      root.appendChild(pCont);
      var box3 = document.createElement("div");
      box3.className = "chart-box";
      box3.style.height = "260px";
      var c3 = document.createElement("canvas");
      box3.appendChild(c3);
      root.appendChild(box3);
      addChart(c3, lineOrBar(monthLabels, [
        { label: "Created (continuing)", data: CONT_CREATED.slice(from, to + 1), borderColor: "#0969da", tension: 0.2, fill: false },
        { label: "Shipped (continuing)", data: CONT_SHIPPED.slice(from, to + 1), borderColor: "#1a7f37", tension: 0.2, fill: false },
      ]));
      var contStats = document.createElement("div");
      contStats.className = "stats";
      contStats.appendChild(stat(fmtPct(CONT_TTM_YOY_SHIPPED), "Shipped TTM YoY (continuing)", "bad"));
      contStats.appendChild(stat(fmtPct(CONT_TTM_YOY_CREATED), "Created TTM YoY (continuing)", "ok"));
      contStats.appendChild(stat(fmtPct(CONT_LAST_FULL_YOY_SHIPPED), "Shipped YoY, Aug 2026", "bad"));
      contStats.appendChild(stat(CONT_TTM_CURR_FILL.toFixed(1) + "%", "Shipped / created, current TTM", "bad"));
      root.appendChild(contStats);
      var contNote = document.createElement("p");
      contNote.className = "muted";
      contNote.textContent = "TTM = Sep 2025-Aug 2026 vs Sep 2024-Aug 2025. Created is up " + fmtPct(CONT_TTM_YOY_CREATED) +
        " and shipped is down " + fmtPct(CONT_TTM_YOY_SHIPPED) + ". Fill fell from " + CONT_TTM_PREV_FILL.toFixed(1) +
        "% to " + CONT_TTM_CURR_FILL.toFixed(1) + "%. Aug 2026 created is " + fmtPct(CONT_LAST_FULL_YOY_CREATED) + " YoY.";
      root.appendChild(contNote);
    }

    var grid = document.createElement("div");
    grid.className = "grid2";
    var cardA = document.createElement("div");
    cardA.className = "card";
    cardA.innerHTML = "<h3>Top companies by shipped, created, and clients</h3>";
    var boxA = document.createElement("div");
    boxA.className = "chart-box";
    boxA.style.height = "360px";
    var cA = document.createElement("canvas");
    boxA.appendChild(cA);
    cardA.appendChild(boxA);
    cardA.appendChild(table(["Company", "Shipped", "Created", "Peak clients"], top.map(function (r) {
      return [r.company, r.shipped.toLocaleString(), r.created.toLocaleString(), String(r.clientsPeak)];
    }), 1));
    addChart(cA, hBar(top.map(function (r) { return r.company; }), [
      { label: "OrderShippedCount", data: top.map(function (r) { return r.shipped; }), backgroundColor: "#1a7f37" },
      { label: "OrderCreatedCount", data: top.map(function (r) { return r.created; }), backgroundColor: "#0969da" },
      { label: "Peak monthly clients", data: top.map(function (r) { return r.clientsPeak; }), backgroundColor: "#9a6700" },
    ]));
    var cardB = document.createElement("div");
    cardB.className = "card";
    cardB.innerHTML = "<h3>Volume by database</h3>";
    var boxB = document.createElement("div");
    boxB.className = "chart-box";
    boxB.style.height = "360px";
    var cB = document.createElement("canvas");
    boxB.appendChild(cB);
    cardB.appendChild(boxB);
    cardB.appendChild(table(["Database", "Shipped", "Created", "Peak clients"], dbPeriod.map(function (r) {
      return [r.db, r.shipped.toLocaleString(), r.created.toLocaleString(), String(r.clientsPeak)];
    }), 1));
    addChart(cB, hBar(dbPeriod.map(function (r) { return r.db; }), [
      { label: "Created", data: dbPeriod.map(function (r) { return r.created; }), backgroundColor: "#0969da" },
      { label: "Shipped", data: dbPeriod.map(function (r) { return r.shipped; }), backgroundColor: "#1a7f37" },
      { label: "Peak monthly clients", data: dbPeriod.map(function (r) { return r.clientsPeak; }), backgroundColor: "#9a6700" },
    ]));
    grid.appendChild(cardA);
    grid.appendChild(cardB);
    root.appendChild(grid);

    var hOff = document.createElement("h2");
    hOff.textContent = "Where the volume went - offboarded accounts";
    root.appendChild(hOff);
    if (offboardedRows.length) {
      var boxO = document.createElement("div");
      boxO.className = "chart-box";
      boxO.style.height = "240px";
      var cO = document.createElement("canvas");
      boxO.appendChild(cO);
      root.appendChild(boxO);
      var topOff = offboardedRows.slice(0, 6);
      addChart(cO, hBar(topOff.map(function (r) { return entityClient(r) || r.company; }), [
        { label: "Prior-year shipped orders now at zero", data: topOff.map(function (r) { return r.lost; }), backgroundColor: "#cf222e" },
      ]));
      root.appendChild(table(["Database", "Company", "Client", "Last active month", "Prior-year shipped"], offboardedRows.map(function (r) {
        return [r.db, entityCompany(r), entityClient(r) || "-", r.lastActive, r.lost.toLocaleString()];
      }), 4));
    }

    if (movers.decliners.length || movers.growers.length) {
      var mg = document.createElement("div");
      mg.className = "grid2";
      if (movers.decliners.length) {
        var cd = document.createElement("div");
        cd.className = "card";
        cd.innerHTML = "<h3>Shrinking companies (still shipping)</h3>";
        cd.appendChild(table(["Company", isAllTime ? "Prior TTM" : "Prior", isAllTime ? "Current TTM" : "Current", "YoY", "Peak clients"], movers.decliners.map(function (r) {
          return [r.company, r.prev.toLocaleString(), r.curr.toLocaleString(), fmtPct(r.yoy), String(r.clients)];
        }), 1));
        mg.appendChild(cd);
      }
      if (movers.growers.length) {
        var cg = document.createElement("div");
        cg.className = "card";
        cg.innerHTML = "<h3>Growing companies</h3>";
        cg.appendChild(table(["Company", isAllTime ? "Prior TTM" : "Prior", isAllTime ? "Current TTM" : "Current", "YoY", "Peak clients"], movers.growers.map(function (r) {
          return [r.company, r.prev.toLocaleString(), r.curr.toLocaleString(), fmtPct(r.yoy), String(r.clients)];
        }), 1));
        mg.appendChild(cg);
      }
      root.appendChild(mg);
    }

    var hConc = document.createElement("h2");
    hConc.textContent = "Revenue-risk concentration";
    root.appendChild(hConc);
    var pConc = document.createElement("p");
    pConc.className = "muted";
    pConc.textContent = "Share of the 5.22M current-TTM shipped orders. Pepsi is 29% of remaining volume.";
    root.appendChild(pConc);
    var boxC = document.createElement("div");
    boxC.className = "chart-box";
    boxC.style.height = "250px";
    var cC = document.createElement("canvas");
    boxC.appendChild(cC);
    root.appendChild(boxC);
    addChart(cC, hBar(CONCENTRATION.map(function (r) { return r.company; }), [
      { label: "Share of TTM shipped orders", data: CONCENTRATION.map(function (r) { return r.share; }), backgroundColor: "#0969da" },
    ], "%"));

    var hTot = document.createElement("h2");
    hTot.textContent = "Company totals";
    root.appendChild(hTot);
    var wrapT = document.createElement("div");
    wrapT.className = "scroll";
    wrapT.appendChild(table(["Database", "Company", "Created", "Shipped", "Fill %", "Peak clients"], filtered.map(function (r) {
      return [r.db, r.company, r.created.toLocaleString(), r.shipped.toLocaleString(), r.fill.toFixed(1), String(r.clientsPeak)];
    }), 2));
    root.appendChild(wrapT);

    var hFill = document.createElement("h2");
    hFill.textContent = "Data quality - created vs shipped mismatches";
    root.appendChild(hFill);
    root.appendChild(table(["Database", "Company", "Created", "Shipped", "Fill %"], fillRows.map(function (r) {
      return [r.db, r.company, r.created.toLocaleString(), r.shipped.toLocaleString(), r.fill.toFixed(1)];
    }), 2));
    var note = document.createElement("p");
    note.className = "muted";
    note.textContent = "Created = distinct warehouse orders by CreatedDate. Shipped on six databases = distinct warehouse-order IDs; DeliverrLiveDB shipped is shipment row count. Clients = distinct depositors with created orders that month.";
    root.appendChild(note);
  }

  function renderDataStudio(root) {
    var selectedRange = resolvePeriod(state.quarter, state.month);
    var from = selectedRange.from, to = selectedRange.to;
    var monthLabels = MONTH_LABELS.slice(from, to + 1);
    var inDatabase = state.dsDb === "all" ? ENTITIES : ENTITIES.filter(function (r) { return r.db === state.dsDb; });
    var companyOptions = [];
    inDatabase.forEach(function (r) { if (companyOptions.indexOf(r.company) < 0) companyOptions.push(r.company); });
    var inCompany = state.dsCompany === "all" ? inDatabase : inDatabase.filter(function (r) { return r.company === state.dsCompany; });
    if (!inCompany.length) inCompany = inDatabase;
    var clientOptions = inCompany.filter(function (r) { return r.client; }).map(function (r) { return r.client; });
    var scopeRows = state.dsClient === "all" ? inCompany : inCompany.filter(function (r) { return r.client === state.dsClient; });
    if (!scopeRows.length) scopeRows = inCompany;
    var scopeCreated = seriesSum(scopeRows, "created");
    var scopeShipped = seriesSum(scopeRows, "shipped");
    var scopeClients = seriesSum(scopeRows, "clients");
    var slice = function (v) { return v.slice(from, to + 1); };

    var p = document.createElement("p");
    p.className = "lede";
    p.textContent = "Looker Studio replica: shipped vs created by month for the migrated accounts. Flexport clients appear in the Client filter.";
    root.appendChild(p);

    var filters = document.createElement("div");
    filters.className = "filters";
    filters.appendChild(labeled("Database", sel("dsdb", state.dsDb, [{ value: "all", label: "All databases" }].concat(DATABASES.map(function (d) { return { value: d, label: d }; })), function (v) { state.dsDb = v; state.dsCompany = "all"; state.dsClient = "all"; render(); })));
    filters.appendChild(labeled("Company", sel("dsco", state.dsCompany, [{ value: "all", label: "All companies" }].concat(companyOptions.map(function (c) { return { value: c, label: c }; })), function (v) { state.dsCompany = v; state.dsClient = "all"; render(); })));
    filters.appendChild(labeled("Client", sel("dscl", state.dsClient, [{ value: "all", label: "All clients" }].concat(clientOptions.map(function (c) { return { value: c, label: c }; })), function (v) { state.dsClient = v; render(); })));
    filters.appendChild(labeled("Quarter", sel("dsq", state.month !== "none" ? "none" : state.quarter, [{ value: "none", label: "Not used" }, { value: "all", label: ALL_TIME.label }].concat(QUARTER_RANGES.map(function (r) { return { value: r.value, label: r.label }; })), function (v) {
      if (v === "none") state.quarter = state.month !== "none" ? "none" : "all";
      else { state.quarter = v; state.month = "none"; }
      render();
    })));
    filters.appendChild(labeled("Month", sel("dsm", state.month, [{ value: "none", label: "Not used" }].concat(MONTH_RANGES.map(function (r) { return { value: r.value, label: r.label }; })), function (v) {
      state.month = v;
      state.quarter = v === "none" ? "all" : "none";
      render();
    })));
    root.appendChild(filters);

    var stats = document.createElement("div");
    stats.className = "stats";
    stats.appendChild(stat(fmt(sumRange(scopeShipped, from, to)), "OrderShippedCount (selection)"));
    stats.appendChild(stat(fmt(sumRange(scopeCreated, from, to)), "OrderCreatedCount (selection)"));
    stats.appendChild(stat(String(Math.max.apply(null, [0].concat(slice(scopeClients)))), "Peak monthly clients"));
    stats.appendChild(stat(String(scopeRows.length), "Rows (company / client)"));
    root.appendChild(stats);

    var h = document.createElement("h2");
    h.textContent = "Migrated accounts - shipped vs created";
    root.appendChild(h);
    var box = document.createElement("div");
    box.className = "chart-box";
    box.style.height = "300px";
    var cv = document.createElement("canvas");
    box.appendChild(cv);
    root.appendChild(box);
    addChart(cv, {
      type: "bar",
      data: {
        labels: monthLabels,
        datasets: [
          { label: "OrderShippedCount", data: slice(scopeShipped), backgroundColor: "#0969da" },
          { label: "OrderCreatedCount", data: slice(scopeCreated), backgroundColor: "#1a7f37" },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } },
    });
    var boxL = document.createElement("div");
    boxL.className = "chart-box";
    boxL.style.height = "150px";
    var cvL = document.createElement("canvas");
    boxL.appendChild(cvL);
    root.appendChild(boxL);
    addChart(cvL, lineOrBar(monthLabels, [{ label: "Client", data: slice(scopeClients), borderColor: "#9a6700", tension: 0.2, fill: true, backgroundColor: "rgba(154,103,0,0.15)" }]));

    var hAll = document.createElement("h2");
    hAll.textContent = "All accounts (ignores filters above)";
    root.appendChild(hAll);
    var boxA = document.createElement("div");
    boxA.className = "chart-box";
    boxA.style.height = "280px";
    var cvA = document.createElement("canvas");
    boxA.appendChild(cvA);
    root.appendChild(boxA);
    addChart(cvA, {
      type: "bar",
      data: {
        labels: monthLabels,
        datasets: [
          { label: "OrderShippedCount", data: slice(ALL_SHIPPED), backgroundColor: "#0969da" },
          { label: "OrderCreatedCount", data: slice(ALL_CREATED), backgroundColor: "#1a7f37" },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } },
    });
  }

  function render() {
    destroyCharts();
    var root = document.getElementById("app");
    root.innerHTML = "";
    document.getElementById("tab-dashboard").classList.toggle("active", state.tab === "dashboard");
    document.getElementById("tab-datastudio").classList.toggle("active", state.tab === "datastudio");
    if (state.tab === "dashboard") renderDashboard(root);
    else renderDataStudio(root);
  }

  document.getElementById("tab-dashboard").onclick = function () { state.tab = "dashboard"; render(); };
  document.getElementById("tab-datastudio").onclick = function () { state.tab = "datastudio"; render(); };
  render();
})();
