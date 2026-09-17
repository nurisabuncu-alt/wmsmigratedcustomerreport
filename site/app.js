(function () {
  var charts = [];

  Chart.defaults.datasets.bar.maxBarThickness = 64;

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

  var ALL_TIME = { value: "all", label: "All time (Jun 2024 - Sep 16, 2026)", from: 0, to: MONTHS.length - 1 };
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
  function hasVolumeInRange(row, from, to) {
    for (var i = from; i <= to; i++) {
      if (row.created[i] > 0 || row.shipped[i] > 0) return true;
    }
    return false;
  }
  function distinctCounts(rows, from, to) {
    var companies = Object.create(null);
    var clients = Object.create(null);
    var companyCount = 0;
    var clientCount = 0;
    rows.forEach(function (row) {
      if (!hasVolumeInRange(row, from, to)) return;
      if (!companies[row.company]) {
        companies[row.company] = true;
        companyCount += 1;
      }
      var clientKey = row.db + "|" + row.company + "|" + (row.client || "");
      if (!clients[clientKey]) {
        clients[clientKey] = true;
        clientCount += 1;
      }
    });
    return { companies: companyCount, clients: clientCount };
  }
  // Per-company data presence for the last five months: does each Migrated
  // company have created and/or shipped orders in that month at all?
  function migratedMonthlyCoverage() {
    var from = Math.max(0, MONTHS.length - 5);
    var to = MONTHS.length - 1;
    var byCompany = {};
    COMPANY_ROSTER.forEach(function (entry) {
      if (companyStatus(entry.company) === "Migrated") byCompany[entry.company] = [];
    });
    ENTITIES.forEach(function (r) {
      if (byCompany[r.company]) byCompany[r.company].push(r);
    });
    var rows = Object.keys(byCompany).sort().map(function (company) {
      var created = seriesSum(byCompany[company], "created");
      var shipped = seriesSum(byCompany[company], "shipped");
      var months = [];
      for (var i = from; i <= to; i++) {
        months.push({ created: created[i] > 0, shipped: shipped[i] > 0 });
      }
      return { company: company, months: months };
    });
    return { from: from, to: to, rows: rows };
  }
  function coverageCell(month) {
    if (month.created && month.shipped) return "Created + shipped";
    if (month.created) return "Created only";
    if (month.shipped) return "Shipped only";
    return "No data";
  }
  function appendMigratedCoverage(root) {
    var data = migratedMonthlyCoverage();
    var h = document.createElement("h2");
    h.textContent = "Migrated companies - order data by month (last 5 months)";
    root.appendChild(h);
    var note = document.createElement("p");
    note.className = "muted";
    var span = (MONTH_LABELS[data.from] || "") + " – " + (MONTH_LABELS[data.to] || "");
    if (MONTHS[data.to] === "2026-09") span += " (September partial through Sep 16)";
    note.textContent = "Static report, not affected by the filters. Every company with status Migrated on the WMS list, and whether any created or shipped orders exist in each month (" + span + ").";
    root.appendChild(note);
    var headers = ["Company"].concat(MONTH_LABELS.slice(data.from, data.to + 1));
    var wrap = document.createElement("div");
    wrap.className = "scroll";
    wrap.appendChild(table(headers, data.rows.map(function (r) {
      return [r.company].concat(r.months.map(coverageCell));
    }), headers.length));
    root.appendChild(wrap);
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
  // Distinct companies with order activity in each month of the range. Many rows
  // share a company, so summing the per-row client counts would overcount.
  function activeCompaniesPerMonth(rows, from, to) {
    var out = [];
    for (var i = from; i <= to; i++) {
      var seen = Object.create(null);
      var count = 0;
      for (var j = 0; j < rows.length; j++) {
        var row = rows[j];
        if ((row.created[i] > 0 || row.shipped[i] > 0) && !seen[row.company]) {
          seen[row.company] = true;
          count += 1;
        }
      }
      out.push(count);
    }
    return out;
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

  var STATUS_STORAGE = "wms-company-status-v1";
  var rosterByName = {};
  COMPANY_ROSTER.forEach(function (r) { rosterByName[r.company] = r.status; });
  function loadStatusOverrides() {
    try { return JSON.parse(localStorage.getItem(STATUS_STORAGE) || "{}"); } catch (e) { return {}; }
  }
  function saveStatusOverride(company, status) {
    var m = loadStatusOverrides();
    if (status === rosterByName[company]) delete m[company];
    else m[company] = status;
    localStorage.setItem(STATUS_STORAGE, JSON.stringify(m));
  }
  function clearStatusOverrides() {
    localStorage.removeItem(STATUS_STORAGE);
  }
  function applyStatusFeed(rows) {
    var m = loadStatusOverrides();
    rows.forEach(function (r) {
      if (!r || !r.company || !r.status) return;
      if (r.status === rosterByName[r.company]) delete m[r.company];
      else m[r.company] = r.status;
      if (!rosterByName[r.company]) {
        COMPANY_ROSTER.push({ company: r.company, status: r.status });
        rosterByName[r.company] = r.status;
      }
    });
    localStorage.setItem(STATUS_STORAGE, JSON.stringify(m));
  }
  function companyStatus(name) {
    var over = loadStatusOverrides();
    if (Object.prototype.hasOwnProperty.call(over, name)) return over[name];
    return rosterByName[name] || "";
  }
  function rowsForStatus(rows, status) {
    if (status === "all") return rows;
    if (status === "roster") {
      return rows.filter(function (r) { return !!rosterByName[r.company]; });
    }
    return rows.filter(function (r) { return companyStatus(r.company) === status; });
  }
  function parseStatusFeed(text) {
    var trimmed = String(text || "").trim();
    if (!trimmed) return [];
    try {
      var json = JSON.parse(trimmed);
      var list = Array.isArray(json) ? json : json.companies || json.rows || json.data || [];
      return list.map(function (r) {
        if (Array.isArray(r)) return { company: r[0], status: r[1] };
        return { company: r.company || r.Company || r.name, status: r.status || r.Status };
      }).filter(function (r) { return r.company && r.status; });
    } catch (e) { /* HTML table from the Apps Script UI */ }
    var doc = new DOMParser().parseFromString(trimmed, "text/html");
    var out = [];
    doc.querySelectorAll("tr").forEach(function (tr) {
      var cells = Array.prototype.map.call(tr.querySelectorAll("th,td"), function (c) { return c.textContent.trim(); });
      if (cells.length >= 2 && cells[0] && cells[0].toLowerCase() !== "company") {
        out.push({ company: cells[0], status: cells[1] });
      }
    });
    return out;
  }
  function snapshotShippedByCompany() {
    var map = {};
    ENTITIES.forEach(function (r) {
      map[r.company] = (map[r.company] || 0) + r.shipped.reduce(function (s, v) { return s + v; }, 0);
    });
    return map;
  }

  var state = {
    tab: "datastudio",
    db: "all",
    company: "all",
    client: "all",
    quarter: "all",
    month: "none",
    status: "roster",
    statusMessage: "",
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
    var chartDatasets = datasets.map(function (dataset) {
      var copy = Object.assign({}, dataset);
      if (type === "bar" && copy.borderColor) copy.backgroundColor = copy.borderColor;
      return copy;
    });
    return {
      type: type,
      data: { labels: labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: { y: { beginAtZero: true } },
      },
    };
  }
  function abbrevTick(value) {
    var n = Number(value);
    if (n >= 1000000) return Number((n / 1000000).toFixed(1)) + "M";
    if (n >= 1000) return Number((n / 1000).toFixed(1)) + "K";
    return String(n);
  }
  // Looker Studio combo dashlet: order counts as grouped bars on the left axis,
  // company count as a line on a secondary right axis so the small number rides
  // above the bars instead of flattening against the baseline.
  function ordersByCompanyCombo(labels, shipped, created, company) {
    var single = labels.length < 2;
    return {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "line",
            label: "Company",
            data: company,
            yAxisID: "yCompany",
            borderColor: "#4C8DF6",
            backgroundColor: "#4C8DF6",
            borderWidth: 2,
            pointRadius: single ? 4 : 3,
            pointHoverRadius: 6,
            pointHitRadius: 18,
            tension: 0,
            fill: false,
          },
          { label: "OrderShippedCount", data: shipped, yAxisID: "y", backgroundColor: "#FF9E32" },
          { label: "OrderCreatedCount", data: created, yAxisID: "y", backgroundColor: "#9E6DE0" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", align: "start", labels: { boxWidth: 12, boxHeight: 12 } },
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            callbacks: {
              label: function (ctx) {
                var value = ctx.parsed && ctx.parsed.y != null ? ctx.parsed.y : ctx.raw;
                if (ctx.dataset.label === "Company") return "Company: " + value;
                return ctx.dataset.label + ": " + Number(value).toLocaleString();
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: { display: true, text: "OrderShippedCount | OrderCreatedCount" },
            ticks: { callback: abbrevTick },
          },
          yCompany: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: { display: true, text: "Company" },
            grid: { drawOnChartArea: false },
            ticks: { precision: 0 },
          },
        },
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

  function statusFilterOpts() {
    return [{ value: "roster", label: "All companies on WMS list" }, { value: "all", label: "All snapshot companies" }]
      .concat(COMPANY_STATUS_OPTIONS.map(function (s) { return { value: s, label: s }; }));
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
  // Client names exist only where the extraction ran at depositor grain
  // (DeliverrLiveDB / Flexport). Elsewhere we know the client count but no names.
  function clientSelect(id, clientOptions) {
    if (!clientOptions.length) {
      var empty = sel(id, "all", [{ value: "all", label: "No client names in this snapshot" }], function () {});
      empty.disabled = true;
      return empty;
    }
    return sel(id, state.client, [{ value: "all", label: "All clients" }].concat(clientOptions.map(function (c) {
      return { value: c, label: c };
    })), function (v) { state.client = v; render(); });
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
    var inDatabase = rowsForStatus(
      state.db === "all" ? ENTITIES : ENTITIES.filter(function (r) { return r.db === state.db; }),
      state.status
    );
    var companyOptions = [];
    inDatabase.forEach(function (r) { if (companyOptions.indexOf(r.company) < 0) companyOptions.push(r.company); });
    companyOptions.sort();
    if (state.company !== "all" && companyOptions.indexOf(state.company) < 0) state.company = "all";
    var inCompany = state.company === "all" ? inDatabase : inDatabase.filter(function (r) { return r.company === state.company; });
    var clientOptions = [];
    inCompany.forEach(function (r) { if (r.client && clientOptions.indexOf(r.client) < 0) clientOptions.push(r.client); });
    clientOptions.sort();
    if (state.client !== "all" && clientOptions.indexOf(state.client) < 0) state.client = "all";

    var scopeEntities = inCompany;
    if (state.client !== "all") scopeEntities = scopeEntities.filter(function (r) { return r.client === state.client; });

    var filtered = periodTotals(scopeEntities, from, to);
    var scopeCreated = seriesSum(scopeEntities, "created");
    var scopeShipped = seriesSum(scopeEntities, "shipped");
    var scopeClients = seriesSum(scopeEntities, "clients");
    var chartCreated = scopeCreated.slice(from, to + 1);
    var chartShipped = scopeShipped.slice(from, to + 1);
    var chartClients = scopeClients.slice(from, to + 1);
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
    var yoyLabel = isAllTime ? "Latest-month YoY (Sep partial vs Sep 2025)" : isMonth ? "YoY vs same month last year" : "YoY vs same quarter last year";
    var seqLabel = isAllTime ? "Latest-month change (Sep partial vs Aug 2026)" : isMonth ? "vs prior month" : "vs prior quarter";
    var scopeLabel = state.client !== "all" ? state.client : state.company !== "all" ? state.company : state.db === "all" ? "all databases" : state.db;
    var portfolioView = state.company === "all" && state.client === "all";
    var moverFrom = isAllTime ? 15 : from;
    var moverTo = isAllTime ? 26 : to;
    var movers = companyMovers(scopeEntities, moverFrom, moverTo);
    var priorMoverFrom = moverFrom - 12;
    var priorMoverTo = moverTo - 12;
    var offboardedRows = priorMoverFrom < 0 ? [] : scopeEntities.map(function (r) {
      var prior = sumRange(r.shipped, priorMoverFrom, priorMoverTo);
      var current = sumRange(r.shipped, moverFrom, moverTo);
      var lastActiveIndex = -1;
      for (var i = 0; i <= moverTo; i++) if (r.shipped[i] > 0) lastActiveIndex = i;
      return { db: r.db, company: r.company, client: r.client, lost: prior, current: current, lastActive: lastActiveIndex < 0 ? "-" : MONTHS[lastActiveIndex] };
    }).filter(function (r) { return r.lost > 0 && r.current === 0; })
      .sort(function (a, b) { return b.lost - a.lost; });
    var fillRows = filtered.filter(function (r) { return r.created > 0 && (r.fill < 80 || r.fill > 120); });

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

    var continuingEntities = scopeEntities.filter(function (r) { return sumRange(r.shipped, 15, 26) > 0; });
    var continuingCreated = seriesSum(continuingEntities, "created");
    var continuingShipped = seriesSum(continuingEntities, "shipped");
    var continuingClients = seriesSum(continuingEntities, "clients");
    var continuingCount = continuingEntities.length;
    var continuingCurrentFrom = isAllTime ? 15 : from;
    var continuingCurrentTo = isAllTime ? 26 : to;
    var continuingPreviousFrom = continuingCurrentFrom - 12;
    var continuingPreviousTo = continuingCurrentTo - 12;
    var hasContinuingComparison = continuingPreviousFrom >= 0;
    var continuingCurrentCreated = sumRange(continuingCreated, continuingCurrentFrom, continuingCurrentTo);
    var continuingCurrentShipped = sumRange(continuingShipped, continuingCurrentFrom, continuingCurrentTo);
    var continuingPreviousCreated = hasContinuingComparison ? sumRange(continuingCreated, continuingPreviousFrom, continuingPreviousTo) : 0;
    var continuingPreviousShipped = hasContinuingComparison ? sumRange(continuingShipped, continuingPreviousFrom, continuingPreviousTo) : 0;
    var continuingFill = continuingCurrentCreated ? (100 * continuingCurrentShipped) / continuingCurrentCreated : 0;

    var concentration = filtered.filter(function (r) { return r.shipped > 0; }).map(function (r) {
      return { company: r.company, shipped: r.shipped, share: shipped ? (100 * r.shipped) / shipped : 0 };
    }).sort(function (a, b) { return b.shipped - a.shipped; }).slice(0, 8);

    var activeRows = scopeEntities.filter(function (r) {
      return sumRange(r.created, from, to) > 0 || sumRange(r.shipped, from, to) > 0;
    });

    var intro = document.createElement("p");
    intro.className = "lede";
    intro.textContent = "Order created vs shipped across three servers and seven databases, Jun 2024 - Sep 16, 2026. SQL was extracted without a COMP_ID filter; the default graph scope is the WMS company list. Every figure below follows the filters.";
    root.appendChild(intro);
    var pills = document.createElement("div");
    pills.className = "pills";
    [
      dbPeriod.length + (dbPeriod.length === 1 ? " database" : " databases"),
      filtered.length + (filtered.length === 1 ? " company with volume" : " companies with volume"),
      activeRows.length + (activeRows.length === 1 ? " company/client account" : " company/client accounts"),
      "Snapshot, not live",
    ].forEach(function (t) {
      var p = document.createElement("span");
      p.className = "pill";
      p.textContent = t;
      pills.appendChild(p);
    });
    root.appendChild(pills);

    var call = document.createElement("div");
    call.className = "callout";
    call.textContent = scopeLabel + " | " + selectedRange.label + ": " +
      created.toLocaleString() + " orders created, " + shipped.toLocaleString() +
      " shipped, " + fill.toFixed(1) + "% shipped/created.";
    root.appendChild(call);

    var filters = document.createElement("div");
    filters.className = "filters";
    filters.appendChild(labeled("Status", sel("status", state.status, statusFilterOpts(), function (v) { state.status = v; state.company = "all"; state.client = "all"; render(); })));
    filters.appendChild(labeled("Database", sel("db", state.db, [{ value: "all", label: "All databases" }].concat(DB_TOTALS.map(function (r) { return { value: r.db, label: r.db }; })), function (v) { state.db = v; state.company = "all"; state.client = "all"; render(); })));
    filters.appendChild(labeled("Company", sel("co", state.company, [{ value: "all", label: "All companies" }].concat(companyOptions.map(function (c) { return { value: c, label: c }; })), function (v) { state.company = v; state.client = "all"; render(); })));
    filters.appendChild(labeled("Client", clientSelect("cl", clientOptions)));
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
    stats.appendChild(stat(fmtPct(scopeYoyCreated), "Created " + yoyLabel, scopeYoyCreated < 0 ? "bad" : "ok"));
    stats.appendChild(stat(fmtPct(scopeYoyShipped), "Shipped " + yoyLabel, scopeYoyShipped < 0 ? "bad" : "ok"));
    if (isAllTime || hasPriorPeriod) {
      stats.appendChild(stat(fmtPct(scopeSeqCreated), "Created " + seqLabel, scopeSeqCreated < 0 ? "bad" : "ok"));
      stats.appendChild(stat(fmtPct(scopeSeqShipped), "Shipped " + seqLabel, scopeSeqShipped < 0 ? "bad" : "ok"));
    }
    var counts = distinctCounts(scopeEntities, from, to);
    stats.appendChild(stat(String(counts.companies), "Total companies"));
    stats.appendChild(stat(String(counts.clients), "Total clients"));
    root.appendChild(stats);

    var cap = document.createElement("p");
    cap.className = "muted";
    cap.textContent = "Filters: Status, Database, Company, Client, and either Quarter or Month. Default Status includes every company on the WMS list. September 2026 is partial through Sep 16. " + scopeLabel + " | " + selectedRange.label + " | " + state.status;
    root.appendChild(cap);

    var h2 = document.createElement("h2");
    h2.textContent = (portfolioView ? "All accounts" : scopeLabel) + " - created vs shipped per month";
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
    appendMigratedCoverage(root);

    if (continuingCount) {
      var hCont = document.createElement("h2");
      hCont.textContent = "Continuing accounts only - created vs shipped per month";
      root.appendChild(hCont);
      var pCont = document.createElement("p");
      pCont.className = "muted";
      pCont.textContent = scopeLabel + " | " + selectedRange.label + " | " + continuingCount +
        (continuingCount === 1 ? " matching company/client row" : " matching company/client rows") +
        " still shipping in the latest twelve months.";
      root.appendChild(pCont);
      var box3 = document.createElement("div");
      box3.className = "chart-box";
      box3.style.height = "260px";
      var c3 = document.createElement("canvas");
      box3.appendChild(c3);
      root.appendChild(box3);
      addChart(c3, lineOrBar(monthLabels, [
        { label: "Created (continuing)", data: continuingCreated.slice(from, to + 1), borderColor: "#0969da", tension: 0.2, fill: false },
        { label: "Shipped (continuing)", data: continuingShipped.slice(from, to + 1), borderColor: "#1a7f37", tension: 0.2, fill: false },
      ]));
      var box3Clients = document.createElement("div");
      box3Clients.className = "chart-box";
      box3Clients.style.height = "160px";
      var c3Clients = document.createElement("canvas");
      box3Clients.appendChild(c3Clients);
      root.appendChild(box3Clients);
      addChart(c3Clients, lineOrBar(monthLabels, [
        { label: "Clients (continuing)", data: continuingClients.slice(from, to + 1), borderColor: "#9a6700", backgroundColor: "rgba(154,103,0,0.15)", tension: 0.2, fill: true },
      ]));
      var contStats = document.createElement("div");
      contStats.className = "stats";
      if (hasContinuingComparison) {
        var continuingShippedChange = pctChange(continuingCurrentShipped, continuingPreviousShipped);
        var continuingCreatedChange = pctChange(continuingCurrentCreated, continuingPreviousCreated);
        contStats.appendChild(stat(fmtPct(continuingShippedChange), "Shipped vs prior year (continuing)", continuingShippedChange < 0 ? "bad" : "ok"));
        contStats.appendChild(stat(fmtPct(continuingCreatedChange), "Created vs prior year (continuing)", continuingCreatedChange < 0 ? "bad" : "ok"));
      }
      contStats.appendChild(stat(continuingFill.toFixed(1) + "%", "Shipped / created (continuing)"));
      root.appendChild(contStats);
    }

    var grid = document.createElement("div");
    grid.className = "grid2";
    var cardA = document.createElement("div");
    cardA.className = "card";
    cardA.innerHTML = "<h3>Top companies by shipped and created</h3>";
    var boxA = document.createElement("div");
    boxA.className = "chart-box";
    boxA.style.height = "360px";
    var cA = document.createElement("canvas");
    boxA.appendChild(cA);
    cardA.appendChild(boxA);
    cardA.appendChild(table(["Company", "Shipped", "Created"], top.map(function (r) {
      return [r.company, r.shipped.toLocaleString(), r.created.toLocaleString()];
    }), 1));
    addChart(cA, hBar(top.map(function (r) { return r.company; }), [
      { label: "OrderShippedCount", data: top.map(function (r) { return r.shipped; }), backgroundColor: "#1a7f37" },
      { label: "OrderCreatedCount", data: top.map(function (r) { return r.created; }), backgroundColor: "#0969da" },
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
    cardB.appendChild(table(["Database", "Shipped", "Created"], dbPeriod.map(function (r) {
      return [r.db, r.shipped.toLocaleString(), r.created.toLocaleString()];
    }), 1));
    addChart(cB, hBar(dbPeriod.map(function (r) { return r.db; }), [
      { label: "Created", data: dbPeriod.map(function (r) { return r.created; }), backgroundColor: "#0969da" },
      { label: "Shipped", data: dbPeriod.map(function (r) { return r.shipped; }), backgroundColor: "#1a7f37" },
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
      addChart(cO, hBar(topOff.map(function (r) { return r.client || r.company; }), [
        { label: "Prior-year shipped orders now at zero", data: topOff.map(function (r) { return r.lost; }), backgroundColor: "#cf222e" },
      ]));
      root.appendChild(table(["Database", "Company", "Client", "Last active month", "Prior-year shipped"], offboardedRows.map(function (r) {
        return [r.db, r.company, r.client || "-", r.lastActive, r.lost.toLocaleString()];
      }), 4));
    }

    if (movers.decliners.length || movers.growers.length) {
      var mg = document.createElement("div");
      mg.className = "grid2";
      if (movers.decliners.length) {
        var cd = document.createElement("div");
        cd.className = "card";
        cd.innerHTML = "<h3>Shrinking companies (still shipping)</h3>";
        cd.appendChild(table(["Company", isAllTime ? "Prior TTM" : "Prior", isAllTime ? "Current TTM" : "Current", "YoY"], movers.decliners.map(function (r) {
          return [r.company, r.prev.toLocaleString(), r.curr.toLocaleString(), fmtPct(r.yoy)];
        }), 1));
        mg.appendChild(cd);
      }
      if (movers.growers.length) {
        var cg = document.createElement("div");
        cg.className = "card";
        cg.innerHTML = "<h3>Growing companies</h3>";
        cg.appendChild(table(["Company", isAllTime ? "Prior TTM" : "Prior", isAllTime ? "Current TTM" : "Current", "YoY"], movers.growers.map(function (r) {
          return [r.company, r.prev.toLocaleString(), r.curr.toLocaleString(), fmtPct(r.yoy)];
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
    pConc.textContent = "Share of " + shipped.toLocaleString() + " shipped orders for " + scopeLabel + " | " + selectedRange.label + ".";
    root.appendChild(pConc);
    var boxC = document.createElement("div");
    boxC.className = "chart-box";
    boxC.style.height = "250px";
    var cC = document.createElement("canvas");
    boxC.appendChild(cC);
    root.appendChild(boxC);
    addChart(cC, hBar(concentration.map(function (r) { return r.company; }), [
      { label: "Share of selected shipped orders", data: concentration.map(function (r) { return Number(r.share.toFixed(1)); }), backgroundColor: "#0969da" },
    ], "%"));

    var hTot = document.createElement("h2");
    hTot.textContent = "Company totals";
    root.appendChild(hTot);
    var wrapT = document.createElement("div");
    wrapT.className = "scroll";
    wrapT.appendChild(table(["Database", "Company", "Created", "Shipped", "Fill %"], filtered.map(function (r) {
      return [r.db, r.company, r.created.toLocaleString(), r.shipped.toLocaleString(), r.fill.toFixed(1)];
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
    var inDatabaseAll = state.db === "all" ? ENTITIES : ENTITIES.filter(function (r) { return r.db === state.db; });
    var inDatabase = rowsForStatus(inDatabaseAll, state.status);
    var companyOptions = [];
    inDatabase.forEach(function (r) { if (companyOptions.indexOf(r.company) < 0) companyOptions.push(r.company); });
    companyOptions.sort();
    if (state.company !== "all" && companyOptions.indexOf(state.company) < 0) state.company = "all";
    var inCompany = state.company === "all" ? inDatabase : inDatabase.filter(function (r) { return r.company === state.company; });
    var clientOptions = [];
    inCompany.forEach(function (r) { if (r.client && clientOptions.indexOf(r.client) < 0) clientOptions.push(r.client); });
    clientOptions.sort();
    if (state.client !== "all" && clientOptions.indexOf(state.client) < 0) state.client = "all";
    var scopeRows = state.client === "all" ? inCompany : inCompany.filter(function (r) { return r.client === state.client; });
    var scopeCreated = seriesSum(scopeRows, "created");
    var scopeShipped = seriesSum(scopeRows, "shipped");
    var monthLabels = MONTH_LABELS.slice(from, to + 1);
    // Ignores the Status filter, but stays on the WMS company list so internal
    // and test accounts never inflate the company count.
    var rosterScoped = rowsForStatus(inDatabaseAll, "roster");
    var allStatusCompany = state.company === "all" ? rosterScoped : rosterScoped.filter(function (r) { return r.company === state.company; });
    var allStatusRows = state.client === "all" ? allStatusCompany : allStatusCompany.filter(function (r) { return r.client === state.client; });
    var allCreated = seriesSum(allStatusRows, "created").slice(from, to + 1);
    var allShipped = seriesSum(allStatusRows, "shipped").slice(from, to + 1);
    var allCompanies = activeCompaniesPerMonth(allStatusRows, from, to);

    var p = document.createElement("p");
    p.className = "lede";
    p.textContent = "Looker Studio replica: shipped vs created by month. The filters below drive the All Matching Accounts chart, the stats, and the raw data. The Migrated Accounts chart and the last-5-months coverage table are fixed reports.";
    root.appendChild(p);

    var filters = document.createElement("div");
    filters.className = "filters";
    filters.appendChild(labeled("Status", sel("dsst", state.status, statusFilterOpts(), function (v) { state.status = v; state.company = "all"; state.client = "all"; render(); })));
    filters.appendChild(labeled("Database", sel("dsdb", state.db, [{ value: "all", label: "All databases" }].concat(DATABASES.map(function (d) { return { value: d, label: d }; })), function (v) { state.db = v; state.company = "all"; state.client = "all"; render(); })));
    filters.appendChild(labeled("Company", sel("dsco", state.company, [{ value: "all", label: "All companies" }].concat(companyOptions.map(function (c) { return { value: c, label: c }; })), function (v) { state.company = v; state.client = "all"; render(); })));
    filters.appendChild(labeled("Client", clientSelect("dscl", clientOptions)));
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
    var counts = distinctCounts(scopeRows, from, to);
    stats.appendChild(stat(fmt(sumRange(scopeShipped, from, to)), "OrderShippedCount (selection)"));
    stats.appendChild(stat(fmt(sumRange(scopeCreated, from, to)), "OrderCreatedCount (selection)"));
    stats.appendChild(stat(String(counts.companies), "Total companies"));
    stats.appendChild(stat(String(counts.clients), "Total clients"));
    root.appendChild(stats);

    var migratedRows = rowsForStatus(ENTITIES, "Migrated");
    var migratedShipped = seriesSum(migratedRows, "shipped");
    var migratedCreated = seriesSum(migratedRows, "created");
    var migratedCompanies = activeCompaniesPerMonth(migratedRows, 0, MONTHS.length - 1);

    var hAll = document.createElement("h2");
    hAll.textContent = "All Matching Accounts Order Shipped VS Created Count per Company per Month";
    root.appendChild(hAll);
    var allNote = document.createElement("p");
    allNote.className = "muted";
    allNote.textContent = "Ignores the Status filter, but counts only companies on the WMS company list. Follows Database, Company, Client, and period.";
    root.appendChild(allNote);
    var boxA = document.createElement("div");
    boxA.className = "chart-box";
    boxA.style.height = "320px";
    var cvA = document.createElement("canvas");
    boxA.appendChild(cvA);
    root.appendChild(boxA);
    addChart(cvA, ordersByCompanyCombo(monthLabels, allShipped, allCreated, allCompanies));

    var h = document.createElement("h2");
    h.textContent = "Migrated Accounts Order Shipped VS Created Count per Company per Month";
    root.appendChild(h);
    var comboNote = document.createElement("p");
    comboNote.className = "muted";
    comboNote.textContent = "Static report: Migrated companies only, every month in the snapshot. The filters above do not change it. Order counts are grouped bars on the left axis; the blue line is the number of distinct companies with order activity that month, on the right axis.";
    root.appendChild(comboNote);
    var box = document.createElement("div");
    box.className = "chart-box";
    box.style.height = "320px";
    var cv = document.createElement("canvas");
    box.appendChild(cv);
    root.appendChild(box);
    addChart(cv, ordersByCompanyCombo(MONTH_LABELS, migratedShipped, migratedCreated, migratedCompanies));
    appendMigratedCoverage(root);

    // One row per account with the months pivoted across the top, so reading a
    // client over time means scrolling right instead of hunting through a row
    // per month.
    var pivotRows = scopeRows.filter(function (r) { return hasVolumeInRange(r, from, to); }).slice().sort(function (a, b) {
      if (a.company !== b.company) return a.company < b.company ? -1 : 1;
      var ac = a.client || "", bc = b.client || "";
      if (ac !== bc) return ac < bc ? -1 : 1;
      return a.db < b.db ? -1 : a.db > b.db ? 1 : 0;
    });
    var hRaw = document.createElement("h2");
    hRaw.textContent = "Raw monthly data";
    root.appendChild(hRaw);
    var rawNote = document.createElement("p");
    rawNote.className = "muted";
    root.appendChild(rawNote);
    var rawWrap = document.createElement("div");
    rawWrap.className = "scroll raw-data";
    root.appendChild(rawWrap);
    var pivot = document.createElement("table");
    pivot.className = "pivot";
    var pHead = document.createElement("thead");
    var monthRow = document.createElement("tr");
    ["lbl1", "lbl2", "lbl3"].forEach(function (cls) {
      var th = document.createElement("th");
      th.className = cls;
      monthRow.appendChild(th);
    });
    var measureRow = document.createElement("tr");
    [["lbl1", "Company"], ["lbl2", "Client"], ["lbl3", "Database"]].forEach(function (pair) {
      var th = document.createElement("th");
      th.className = pair[0];
      th.textContent = pair[1];
      measureRow.appendChild(th);
    });
    for (var mi = from; mi <= to; mi++) {
      var groupTh = document.createElement("th");
      groupTh.className = "grp";
      groupTh.colSpan = 2;
      groupTh.textContent = MONTH_LABELS[mi];
      monthRow.appendChild(groupTh);
      var shippedTh = document.createElement("th");
      shippedTh.className = "num grp-start";
      shippedTh.textContent = "OrderShippedCount";
      measureRow.appendChild(shippedTh);
      var createdTh = document.createElement("th");
      createdTh.className = "num";
      createdTh.textContent = "OrderCreatedCount";
      measureRow.appendChild(createdTh);
    }
    pHead.appendChild(monthRow);
    pHead.appendChild(measureRow);
    pivot.appendChild(pHead);
    var pBody = document.createElement("tbody");
    pivot.appendChild(pBody);
    rawWrap.appendChild(pivot);
    // Every account across every month is far too many cells to build at once,
    // so rows arrive in pages on demand.
    var RAW_PAGE = 250;
    var shown = 0;
    var moreWrap = document.createElement("div");
    moreWrap.className = "filters";
    var more = document.createElement("button");
    more.className = "tab";
    more.type = "button";
    moreWrap.appendChild(more);
    root.appendChild(moreWrap);
    function labelCell(cls, text) {
      var td = document.createElement("td");
      td.className = cls;
      td.textContent = text;
      td.title = text;
      return td;
    }
    function measureCell(value, isGroupStart) {
      var td = document.createElement("td");
      td.className = isGroupStart ? "num grp-start" : "num";
      td.textContent = value > 0 ? value.toLocaleString() : value === 0 ? "0" : "-";
      return td;
    }
    function showMoreRows() {
      var next = Math.min(shown + RAW_PAGE, pivotRows.length);
      var frag = document.createDocumentFragment();
      for (var i = shown; i < next; i++) {
        var row = pivotRows[i];
        var prev = i > 0 ? pivotRows[i - 1] : null;
        var tr = document.createElement("tr");
        // Repeat the company on continuation rows, dimmed, so vertical scrolling
        // never leaves a client without its company.
        var repeat = prev && prev.company === row.company;
        tr.appendChild(labelCell(repeat ? "lbl1 dim" : "lbl1", row.company));
        tr.appendChild(labelCell("lbl2", row.client || "-"));
        tr.appendChild(labelCell("lbl3", row.db));
        for (var m = from; m <= to; m++) {
          var active = row.created[m] > 0 || row.shipped[m] > 0 || row.clients[m] > 0;
          tr.appendChild(measureCell(active ? row.shipped[m] : -1, true));
          tr.appendChild(measureCell(active ? row.created[m] : -1, false));
        }
        frag.appendChild(tr);
      }
      pBody.appendChild(frag);
      shown = next;
      rawNote.textContent = pivotRows.length.toLocaleString() + " accounts matching all active filters, one row per company and client. " +
        "Months run across the top — scroll right for later months. Showing " + shown.toLocaleString() + " of " +
        pivotRows.length.toLocaleString() + ".";
      var remaining = pivotRows.length - shown;
      more.textContent = "Show " + Math.min(RAW_PAGE, remaining).toLocaleString() + " more accounts";
      moreWrap.style.display = remaining > 0 ? "" : "none";
    }
    more.onclick = showMoreRows;
    showMoreRows();
  }

  function renderCompanyList(root) {
    var shippedMap = snapshotShippedByCompany();
    var intro = document.createElement("p");
    intro.className = "lede";
    intro.textContent = "WMS company list (" + COMPANY_ROSTER.length + "). Change a status here and the dashboard and Data Studio tabs follow it. Edits stay in this browser until you reset.";
    root.appendChild(intro);

    var actions = document.createElement("div");
    actions.className = "filters";
    var refresh = document.createElement("button");
    refresh.className = "tab";
    refresh.type = "button";
    refresh.textContent = "Refresh status from Logiwa app";
    refresh.onclick = function () {
      state.statusMessage = "Refreshing…";
      render();
      fetch(STATUS_FEED_URL, { credentials: "include" }).then(function (res) { return res.text(); }).then(function (text) {
        var rows = parseStatusFeed(text);
        if (!rows.length) throw new Error("The Logiwa app did not return a company/status table. Sign in at the app URL, then paste JSON below.");
        applyStatusFeed(rows);
        state.statusMessage = "Updated " + rows.length + " statuses from the Logiwa app.";
        render();
      }).catch(function (err) {
        state.statusMessage = "Could not read the Logiwa app (" + (err && err.message ? err.message : err) + "). It requires a logiwa.com Google login. Paste JSON {\"companies\":[{\"company\":\"Name\",\"status\":\"Migrated\"}]} below, or edit rows by hand.";
        render();
      });
    };
    actions.appendChild(refresh);
    var reset = document.createElement("button");
    reset.className = "tab";
    reset.type = "button";
    reset.textContent = "Reset to WMS list";
    reset.onclick = function () {
      clearStatusOverrides();
      state.statusMessage = "Statuses restored from the WMS company list workbook.";
      render();
    };
    actions.appendChild(reset);
    var link = document.createElement("a");
    link.href = STATUS_FEED_URL;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open Logiwa status app";
    actions.appendChild(link);
    root.appendChild(actions);

    if (state.statusMessage) {
      var msg = document.createElement("p");
      msg.className = "callout info";
      msg.textContent = state.statusMessage;
      root.appendChild(msg);
    }

    var pasteWrap = document.createElement("div");
    pasteWrap.className = "card";
    var pasteLabel = document.createElement("p");
    pasteLabel.className = "muted";
    pasteLabel.textContent = "If live refresh is blocked, paste a JSON company/status list and apply it.";
    pasteWrap.appendChild(pasteLabel);
    var ta = document.createElement("textarea");
    ta.rows = 4;
    ta.style.width = "100%";
    ta.placeholder = '{"companies":[{"company":"Flexport","status":"Migrated"}]}';
    pasteWrap.appendChild(ta);
    var applyPaste = document.createElement("button");
    applyPaste.className = "tab";
    applyPaste.type = "button";
    applyPaste.textContent = "Apply pasted statuses";
    applyPaste.onclick = function () {
      var rows = parseStatusFeed(ta.value);
      if (!rows.length) {
        state.statusMessage = "No company/status rows found in the pasted text.";
      } else {
        applyStatusFeed(rows);
        state.statusMessage = "Applied " + rows.length + " pasted statuses.";
      }
      render();
    };
    pasteWrap.appendChild(applyPaste);
    root.appendChild(pasteWrap);

    var counts = {};
    COMPANY_STATUS_OPTIONS.forEach(function (s) { counts[s] = 0; });
    COMPANY_ROSTER.forEach(function (r) {
      var st = companyStatus(r.company);
      counts[st] = (counts[st] || 0) + 1;
    });
    var stats = document.createElement("div");
    stats.className = "stats";
    COMPANY_STATUS_OPTIONS.forEach(function (s) {
      stats.appendChild(stat(String(counts[s] || 0), s));
    });
    root.appendChild(stats);

    var list = COMPANY_ROSTER.slice().sort(function (a, b) {
      var sa = companyStatus(a.company);
      var sb = companyStatus(b.company);
      if (sa !== sb) return sa.localeCompare(sb);
      return a.company.localeCompare(b.company);
    });
    var t = document.createElement("table");
    var thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Company</th><th>Status</th><th>In volume snapshot</th><th class=\"num\">Shipped (all time)</th></tr>";
    t.appendChild(thead);
    var tb = document.createElement("tbody");
    list.forEach(function (r) {
      var tr = document.createElement("tr");
      var tdName = document.createElement("td");
      tdName.textContent = r.company;
      tr.appendChild(tdName);
      var tdStatus = document.createElement("td");
      var current = companyStatus(r.company);
      var statusSel = sel("st-" + r.company.replace(/[^a-z0-9]+/gi, "-"), current, COMPANY_STATUS_OPTIONS.map(function (s) {
        return { value: s, label: s };
      }), function (v) {
        saveStatusOverride(r.company, v);
        render();
      });
      statusSel.className = "status-" + current.toLowerCase();
      tdStatus.appendChild(statusSel);
      tr.appendChild(tdStatus);
      var shippedVal = shippedMap[r.company] || 0;
      var tdSnap = document.createElement("td");
      tdSnap.textContent = shippedVal > 0 ? "Yes" : "No";
      tr.appendChild(tdSnap);
      var tdShipped = document.createElement("td");
      tdShipped.className = "num";
      tdShipped.textContent = shippedVal ? shippedVal.toLocaleString() : "-";
      tr.appendChild(tdShipped);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    var wrap = document.createElement("div");
    wrap.className = "scroll raw-data";
    wrap.appendChild(t);
    root.appendChild(wrap);
  }

  function render() {
    destroyCharts();
    var root = document.getElementById("app");
    root.innerHTML = "";
    document.getElementById("tab-dashboard").classList.toggle("active", state.tab === "dashboard");
    document.getElementById("tab-datastudio").classList.toggle("active", state.tab === "datastudio");
    document.getElementById("tab-companies").classList.toggle("active", state.tab === "companies");
    if (state.tab === "dashboard") renderDashboard(root);
    else if (state.tab === "datastudio") renderDataStudio(root);
    else renderCompanyList(root);
  }

  document.getElementById("tab-dashboard").onclick = function () { state.tab = "dashboard"; render(); };
  document.getElementById("tab-datastudio").onclick = function () { state.tab = "datastudio"; render(); };
  document.getElementById("tab-companies").onclick = function () { state.tab = "companies"; render(); };
  render();
})();
