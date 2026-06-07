const year = document.getElementById("year");
if (year) {
  year.textContent = `© ${new Date().getFullYear()} Noeon`;
}

const summaryCards = document.getElementById("summaryCards");
const chartGrid = document.getElementById("chartGrid");
const pointsTableBody = document.querySelector("#pointsTable tbody");
const metaSummaryCards = document.getElementById("metaSummaryCards");
const metaViolationTableBody = document.querySelector("#metaViolationTable tbody");
const auditTableBody = document.querySelector("#auditTable tbody");
const auditSummaryCards = document.getElementById("auditSummaryCards");
const auditStatusFilter = document.getElementById("auditStatusFilter");
const auditFailureFilter = document.getElementById("auditFailureFilter");
const auditRoundFilter = document.getElementById("auditRoundFilter");
const reloadBtn = document.getElementById("reloadBtn");

let allAuditRecords = [];

const cycleCandidates = [
  "/artifacts/noeon_hayek_extreme_cycle.json",
  "/artifacts/noeon_hayek_cycle.json",
  "/artifacts/noeon_native_cycle.json",
  "/artifacts/noeon_cycle.json"
];

function metricLast(points, key) {
  if (!Array.isArray(points) || points.length === 0) {
    return "-";
  }
  const value = points[points.length - 1][key];
  return value === null || value === undefined ? "-" : String(value);
}

function asPercent(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function createSummaryCard(title, value, hint) {
  const article = document.createElement("article");
  article.className = "card";
  article.innerHTML = `<h3>${title}</h3><p class="stat-value">${value}</p><p>${hint}</p>`;
  return article;
}

function scalePoints(values, width, height, padding) {
  if (!values.length) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  return values.map((v, i) => {
    const x = padding + (i / Math.max(1, values.length - 1)) * innerW;
    const y = padding + (1 - (v - min) / span) * innerH;
    return { x, y };
  });
}

function renderLineChart(metricName, metricPoints, formatFn) {
  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = metricName;
  card.appendChild(title);

  const width = 420;
  const height = 180;
  const padding = 20;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.classList.add("line-chart");

  const values = metricPoints.map((p) => Number(p.value || 0));
  const coords = scalePoints(values, width, height, padding);
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", coords.map((p) => `${p.x},${p.y}`).join(" "));
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#65f7c2");
  polyline.setAttribute("stroke-width", "3");
  polyline.setAttribute("stroke-linecap", "round");
  svg.appendChild(polyline);

  coords.forEach((p, idx) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);
    dot.setAttribute("r", 3.5);
    dot.setAttribute("fill", "#ffb86b");
    dot.setAttribute("data-round", String(idx + 1));
    svg.appendChild(dot);
  });

  card.appendChild(svg);

  const latestValue = metricPoints.length
    ? formatFn(metricPoints[metricPoints.length - 1].value)
    : "-";
  const meta = document.createElement("p");
  meta.textContent = `Latest: ${latestValue}`;
  card.appendChild(meta);

  return card;
}

function renderPointsTable(points) {
  pointsTableBody.innerHTML = "";
  points.forEach((point) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${point.round}</td>
      <td>${point.quorumFraction}</td>
      <td>${point.challengeSeconds}</td>
      <td>${point.maliciousSlash}</td>
      <td>${asPercent(point.planCompletionRate)}</td>
      <td>${point.learningDelta.toFixed(4)}</td>
      <td>${point.haltedReason || "-"}</td>
    `;
    pointsTableBody.appendChild(tr);
  });
}

function metaMode(profile) {
  if (!profile || !profile.mode) {
    return "-";
  }
  return String(profile.mode);
}

function renderMetaSummary(metaPolicy = {}) {
  if (!metaSummaryCards) {
    return;
  }

  const profile = metaPolicy.profile || {};
  const violations = Array.isArray(metaPolicy.violations) ? metaPolicy.violations : [];
  const blocking = violations.filter((v) => String(v.level) === "error").length;
  const warnings = violations.filter((v) => String(v.level) !== "error").length;

  metaSummaryCards.innerHTML = "";
  metaSummaryCards.appendChild(
    createSummaryCard(
      "Policy Profile",
      profile.name || "-",
      profile.namespace
        ? `${profile.namespace}@${profile.version || "?"}`
        : "未检测到 profile"
    )
  );
  metaSummaryCards.appendChild(
    createSummaryCard("Mode", metaMode(profile), "enforce/advisory")
  );
  metaSummaryCards.appendChild(
    createSummaryCard("Hardened", metaPolicy.hardened ? "true" : "false", "是否触发运行时加固")
  );
  metaSummaryCards.appendChild(
    createSummaryCard(
      "Violations",
      String(violations.length),
      `blocking=${blocking}, warning=${warnings}`
    )
  );
}

function renderMetaViolations(metaPolicy = {}) {
  if (!metaViolationTableBody) {
    return;
  }

  const violations = Array.isArray(metaPolicy.violations) ? metaPolicy.violations : [];
  metaViolationTableBody.innerHTML = "";

  if (violations.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="6">暂无违规，元规则评估通过。</td>';
    metaViolationTableBody.appendChild(tr);
    return;
  }

  violations.slice(0, 30).forEach((violation) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${violation.level || "-"}</td>
      <td>${violation.kind || "-"}</td>
      <td>${violation.path || "-"}</td>
      <td>${violation.expected || "-"}</td>
      <td>${violation.actual || "-"}</td>
      <td>${violation.message || "-"}</td>
    `;
    metaViolationTableBody.appendChild(tr);
  });
}

async function loadMetaPolicy() {
  if (!metaSummaryCards || !metaViolationTableBody) {
    return;
  }

  let lastError = null;
  for (const candidate of cycleCandidates) {
    try {
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const metaPolicy = data?.cognition?.metaPolicy || {};
      renderMetaSummary(metaPolicy);
      renderMetaViolations(metaPolicy);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  metaSummaryCards.innerHTML = "";
  metaSummaryCards.appendChild(
    createSummaryCard(
      "Meta Policy",
      "未加载",
      `未找到 cycle 产物: ${lastError ? lastError.message : "unknown"}`
    )
  );
  metaViolationTableBody.innerHTML = "";
  const tr = document.createElement("tr");
  tr.innerHTML = '<td colspan="6">无法加载 cycle 产物，暂无法展示元规则违规。</td>';
  metaViolationTableBody.appendChild(tr);
}

function renderAuditTable(records) {
  if (!auditTableBody) {
    return;
  }
  auditTableBody.innerHTML = "";

  const latest = [...records].slice(-80).reverse();
  latest.forEach((record) => {
    const tr = document.createElement("tr");
    const receipt = record.receipt || {};
    const round = getRound(record);
    tr.innerHTML = `
      <td>${record.ts || "-"}</td>
      <td>${round || "-"}</td>
      <td>${record.step || "-"}</td>
      <td>${record.status || "-"}</td>
      <td>${receipt.plugin || "-"}</td>
      <td>${receipt.pluginVersion || "-"}</td>
      <td>${record.failureCategory || "-"}</td>
      <td>${record.reason || "-"}</td>
    `;
    auditTableBody.appendChild(tr);
  });
}

function getRound(record) {
  if (!record || !record.receipt) {
    return null;
  }
  const round = record.receipt.round;
  if (typeof round === "number") {
    return round;
  }

  const m = String(record.step || "").match(/^round_(\d+)$/i);
  return m ? Number(m[1]) : null;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function setSelectOptions(select, values, formatter) {
  if (!select) {
    return;
  }

  const current = select.value || "all";
  const opts = [
    '<option value="all">全部</option>',
    ...values.map((value) => `<option value="${value}">${formatter(value)}</option>`)
  ];
  select.innerHTML = opts.join("");

  const hasCurrent = values.some((v) => String(v) === String(current));
  select.value = hasCurrent ? current : "all";
}

function hydrateAuditFilters(records) {
  const failureCategories = uniqueSorted(
    records.map((r) => r.failureCategory).filter((v) => v !== null && v !== undefined)
  );
  const rounds = uniqueSorted(records.map((r) => getRound(r)).filter((v) => v !== null));

  setSelectOptions(auditFailureFilter, failureCategories, (v) => String(v));
  setSelectOptions(auditRoundFilter, rounds, (v) => `round_${v}`);
}

function applyAuditFilters(records) {
  const status = auditStatusFilter?.value || "all";
  const failure = auditFailureFilter?.value || "all";
  const round = auditRoundFilter?.value || "all";

  return records.filter((record) => {
    if (status !== "all" && String(record.status) !== status) {
      return false;
    }
    if (failure !== "all" && String(record.failureCategory) !== failure) {
      return false;
    }
    if (round !== "all" && String(getRound(record)) !== round) {
      return false;
    }
    return true;
  });
}

function renderAuditSummary(records, filtered) {
  if (!auditSummaryCards) {
    return;
  }

  const failures = filtered.filter((r) => r.status === "failed");
  const byCategory = {};
  failures.forEach((record) => {
    const key = record.failureCategory || "uncategorized";
    byCategory[key] = (byCategory[key] || 0) + 1;
  });

  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
  auditSummaryCards.innerHTML = "";
  auditSummaryCards.appendChild(
    createSummaryCard("总记录", String(records.length), "审计日志总条数")
  );
  auditSummaryCards.appendChild(
    createSummaryCard("筛选后记录", String(filtered.length), "当前筛选结果")
  );
  auditSummaryCards.appendChild(
    createSummaryCard("主要失败类别", `${top[0]} (${top[1]})`, "按当前筛选聚合")
  );
}

function refreshAuditView() {
  const filtered = applyAuditFilters(allAuditRecords);
  renderAuditSummary(allAuditRecords, filtered);
  renderAuditTable(filtered);
}

async function loadAudit() {
  if (!auditTableBody) {
    return;
  }

  try {
    const res = await fetch("/artifacts/noeon_audit.jsonl", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    const records = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    allAuditRecords = records;
    hydrateAuditFilters(records);
    refreshAuditView();
  } catch (err) {
    auditTableBody.innerHTML = "";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8">审计日志加载失败: ${err.message}</td>`;
    auditTableBody.appendChild(tr);
  }
}

async function loadDashboard() {
  try {
    const res = await fetch("/artifacts/noeon_convergence.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const points = Array.isArray(data.points) ? data.points : [];

    summaryCards.innerHTML = "";
    summaryCards.appendChild(
      createSummaryCard("总轮次", String(data.totalRounds || 0), "训练迭代次数")
    );
    summaryCards.appendChild(
      createSummaryCard("最新 Quorum", metricLast(points, "quorumFraction"), "验证阈值强度")
    );
    summaryCards.appendChild(
      createSummaryCard(
        "最新 Plan 完成率",
        points.length ? asPercent(points[points.length - 1].planCompletionRate) : "-",
        "计划执行覆盖程度"
      )
    );

    chartGrid.innerHTML = "";
    const metrics = data.metrics || {};
    chartGrid.appendChild(
      renderLineChart("Quorum Fraction", metrics.quorumFraction || [], (v) => String(v))
    );
    chartGrid.appendChild(
      renderLineChart("Challenge Seconds", metrics.challengeSeconds || [], (v) => `${v}s`)
    );
    chartGrid.appendChild(
      renderLineChart("Malicious Slash", metrics.maliciousSlash || [], (v) => `${v}%`)
    );
    chartGrid.appendChild(
      renderLineChart("Plan Completion", metrics.planCompletionRate || [], asPercent)
    );
    chartGrid.appendChild(
      renderLineChart("Learning Delta", metrics.learningDelta || [], (v) => Number(v).toFixed(4))
    );

    renderPointsTable(points);
    await loadMetaPolicy();
    await loadAudit();
  } catch (err) {
    summaryCards.innerHTML = "";
    chartGrid.innerHTML = "";
    pointsTableBody.innerHTML = "";
    if (metaSummaryCards) {
      metaSummaryCards.innerHTML = "";
      metaSummaryCards.appendChild(
        createSummaryCard("Meta Policy", "未加载", "训练曲线加载失败")
      );
    }
    if (metaViolationTableBody) {
      metaViolationTableBody.innerHTML = "";
    }

    const errorCard = createSummaryCard(
      "数据加载失败",
      "请先运行 train",
      `原因: ${err.message}`
    );
    summaryCards.appendChild(errorCard);
    await loadAudit();
  }
}

reloadBtn.addEventListener("click", () => {
  loadDashboard();
});

[auditStatusFilter, auditFailureFilter, auditRoundFilter]
  .filter(Boolean)
  .forEach((node) => {
    node.addEventListener("change", refreshAuditView);
  });

loadDashboard();
