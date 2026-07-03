const state = {
  data: null,
  fieldId: null,
  domain: "all",
  country: "ALL",
  period: "10y",
  graphNodes: [],
  animationFrame: null,
};

const formatNumber = new Intl.NumberFormat("ko-KR");
const els = {
  kpiFamilies: document.querySelector("#kpiFamilies"),
  kpiPublications: document.querySelector("#kpiPublications"),
  kpiFields: document.querySelector("#kpiFields"),
  kpiCountries: document.querySelector("#kpiCountries"),
  snapshotLabel: document.querySelector("#snapshotLabel"),
  domainFilter: document.querySelector("#domainFilter"),
  countryFilter: document.querySelector("#countryFilter"),
  periodFilter: document.querySelector("#periodFilter"),
  fieldList: document.querySelector("#fieldList"),
  countryBars: document.querySelector("#countryBars"),
  canvas: document.querySelector("#graphCanvas"),
  reportTitle: document.querySelector("#reportTitle"),
  reportSummary: document.querySelector("#reportSummary"),
  reportFamilies: document.querySelector("#reportFamilies"),
  reportMomentum: document.querySelector("#reportMomentum"),
  reportApplicants: document.querySelector("#reportApplicants"),
  reportBullets: document.querySelector("#reportBullets"),
};

const ctx = els.canvas.getContext("2d");

init();

async function init() {
  const response = await fetch("./data/site-data.json");
  state.data = await response.json();
  state.fieldId = sortedFields()[0]?.id ?? null;
  bindControls();
  render();
  startGraph();
}

function bindControls() {
  for (const country of state.data.dashboard.majorCountries) {
    const option = document.createElement("option");
    option.value = country.country;
    option.textContent = country.labelKo || country.country;
    els.countryFilter.append(option);
  }

  els.domainFilter.addEventListener("change", (event) => {
    state.domain = event.target.value;
    state.fieldId = sortedFields()[0]?.id ?? state.fieldId;
    render();
  });

  els.countryFilter.addEventListener("change", (event) => {
    state.country = event.target.value;
    render();
  });

  els.periodFilter.addEventListener("change", (event) => {
    state.period = event.target.value;
    render();
  });

  els.canvas.addEventListener("click", (event) => {
    const rect = els.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * els.canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * els.canvas.height;
    const hit = state.graphNodes.find((node) => Math.hypot(node.x - x, node.y - y) < node.radius + 8);
    if (!hit) return;
    if (hit.id.startsWith("field:")) {
      const fieldId = hit.id.replace("field:", "");
      if (state.data.fields.some((field) => field.id === fieldId)) {
        state.fieldId = fieldId;
        render();
      }
    }
  });
}

function render() {
  const { summary, generatedAt, dataSnapshotId } = state.data;
  els.kpiFamilies.textContent = formatCompact(summary.familyCount);
  els.kpiPublications.textContent = formatCompact(summary.publicationCount);
  els.kpiFields.textContent = formatNumber.format(summary.fieldCount);
  els.kpiCountries.textContent = formatNumber.format(summary.publicationCountryCount);
  els.snapshotLabel.textContent = `${dataSnapshotId} · ${new Date(generatedAt).toLocaleDateString("ko-KR")}`;
  renderFields();
  renderCountries();
  renderReport();
  prepareGraph();
}

function renderFields() {
  els.fieldList.replaceChildren();
  for (const field of sortedFields()) {
    const row = document.createElement("button");
    row.className = "field-row";
    row.type = "button";
    row.setAttribute("aria-selected", String(field.id === state.fieldId));
    row.addEventListener("click", () => {
      state.fieldId = field.id;
      render();
      document.querySelector("#graph").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const name = document.createElement("div");
    name.className = "field-name";
    name.innerHTML = `<span class="swatch" style="background:${field.color}"></span><span>${field.labelKo}<span class="field-sub">${field.labelEn}</span></span>`;

    const stat = document.createElement("div");
    stat.className = "field-stat";
    stat.textContent = formatCompact(metricFor(field));

    const period = document.createElement("div");
    period.className = "field-period";
    period.textContent = periodLabel();

    row.append(name, stat, period);
    els.fieldList.append(row);
  }
}

function renderCountries() {
  els.countryBars.replaceChildren();
  const selected = selectedField();
  const rows = state.country === "ALL" ? selected.topCountries : [{ key: state.country, count: selected.countryFamilyCounts[state.country] || 0 }];
  const max = Math.max(...rows.map((row) => row.count), 1);

  for (const row of rows.slice(0, 8)) {
    const el = document.createElement("div");
    el.className = "bar-row";
    el.innerHTML = `
      <strong>${row.key}</strong>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(3, (row.count / max) * 100)}%"></span></span>
      <span>${formatCompact(row.count)}</span>
    `;
    els.countryBars.append(el);
  }
}

function renderReport() {
  const field = selectedField();
  els.reportTitle.textContent = field.labelKo;
  els.reportSummary.textContent =
    field.report?.patentTrendSummary ||
    `${field.labelKo} 분야는 최근 10년 기준 ${formatNumber.format(field.familyCount)}개 patent families와 ${formatNumber.format(field.publicationCount)}개 공개문헌이 집계되었습니다.`;
  els.reportFamilies.textContent = formatCompact(field.familyCount);
  els.reportMomentum.textContent = String(field.recentMomentum);
  els.reportApplicants.replaceChildren(...field.topApplicants.slice(0, 5).map((item) => listItem(`${item.key} · ${formatNumber.format(item.count)}`)));

  const bullets = field.report?.proposalReadyBullets?.length
    ? field.report.proposalReadyBullets
    : [
        field.proposalUse || "분야별 기술동향, 경쟁기술, 국내 기회 탐색 문단에 참고 근거로 사용합니다.",
        "metadata-first 집계이므로 강한 주장에는 대표 특허 원문 검증을 붙입니다.",
      ];
  els.reportBullets.replaceChildren(...bullets.slice(0, 5).map(listItem));
}

function prepareGraph() {
  const fieldNodeId = `field:${state.fieldId}`;
  const edges = state.data.graph.edges.filter((edge) => edge.source === fieldNodeId || edge.target === fieldNodeId);
  const nodeIds = new Set([fieldNodeId, ...edges.flatMap((edge) => [edge.source, edge.target])]);
  const nodes = state.data.graph.nodes.filter((node) => nodeIds.has(node.id));
  const width = els.canvas.width;
  const height = els.canvas.height;
  const center = { x: width * 0.44, y: height * 0.5 };
  const fieldById = new Map(state.data.fields.map((field) => [`field:${field.id}`, field]));

  state.graphNodes = nodes.map((node, index) => {
    const isCenter = node.id === fieldNodeId;
    const angle = (index / Math.max(nodes.length - 1, 1)) * Math.PI * 2;
    const ring = node.type === "country" ? 250 : node.type === "taxonomy" ? 170 : 320;
    const field = fieldById.get(node.id);
    return {
      ...node,
      label: field?.shortLabelKo || field?.labelKo || node.label || node.id.replace(/^[^:]+:/, ""),
      color: field?.color || colorForType(node.type),
      x: isCenter ? center.x : center.x + Math.cos(angle) * ring,
      y: isCenter ? center.y : center.y + Math.sin(angle) * ring * 0.68,
      tx: isCenter ? center.x : center.x + Math.cos(angle) * ring,
      ty: isCenter ? center.y : center.y + Math.sin(angle) * ring * 0.68,
      radius: isCenter ? 16 : node.type === "country" ? 9 : 7,
    };
  });
}

function startGraph() {
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  const draw = (time) => {
    drawGraph(time);
    state.animationFrame = requestAnimationFrame(draw);
  };
  state.animationFrame = requestAnimationFrame(draw);
}

function drawGraph(time) {
  if (!state.data) return;
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  drawStars(time);

  const nodesById = new Map(state.graphNodes.map((node) => [node.id, node]));
  const edges = state.data.graph.edges.filter((edge) => nodesById.has(edge.source) && nodesById.has(edge.target));

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = "#8fa8c8";
  for (const edge of edges) {
    const a = nodesById.get(edge.source);
    const b = nodesById.get(edge.target);
    if (!a || !b) continue;
    ctx.lineWidth = Math.min(3.4, 0.6 + Math.log10((edge.weight || 1) + 1));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();

  for (const node of state.graphNodes) {
    node.x += (node.tx + Math.sin(time / 900 + node.x) * 3 - node.x) * 0.04;
    node.y += (node.ty + Math.cos(time / 1100 + node.y) * 3 - node.y) * 0.04;
    ctx.beginPath();
    ctx.fillStyle = node.color;
    ctx.shadowColor = node.color;
    ctx.shadowBlur = node.id.startsWith("field:") ? 22 : 12;
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = node.id.startsWith("field:") ? "700 14px Inter, sans-serif" : "600 11px Inter, sans-serif";
    ctx.fillText(node.label, node.x + node.radius + 8, node.y + 4);
  }
}

function drawStars(time) {
  const width = els.canvas.width;
  const height = els.canvas.height;
  ctx.fillStyle = "#07090d";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 140; i += 1) {
    const x = (i * 73) % width;
    const y = (i * 131) % height;
    const alpha = 0.16 + Math.sin(time / 700 + i) * 0.08;
    ctx.fillStyle = `rgba(222,232,255,${alpha})`;
    ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
  }
}

function sortedFields() {
  return state.data.fields
    .filter((field) => state.domain === "all" || field.domain === state.domain)
    .sort((a, b) => metricFor(b) - metricFor(a));
}

function selectedField() {
  return state.data.fields.find((field) => field.id === state.fieldId) || sortedFields()[0];
}

function metricFor(field) {
  if (state.country !== "ALL") return field.countryFamilyCounts[state.country] || 0;
  if (state.period === "5y") return field.recent5FamilyCount;
  if (state.period === "3y") return field.recent3FamilyCount;
  return field.familyCount;
}

function periodLabel() {
  if (state.country !== "ALL") return state.country;
  if (state.period === "5y") return "recent 5y";
  if (state.period === "3y") return "recent 3y";
  return "10y";
}

function listItem(text) {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

function colorForType(type) {
  if (type === "country") return "#00a7a7";
  if (type === "taxonomy") return "#f2b84b";
  if (type === "corpus") return "#ffffff";
  return "#8fa8c8";
}

function formatCompact(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;
  return formatNumber.format(number);
}
