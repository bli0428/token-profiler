export const DASHBOARD_CSS = `
:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --panel: #ffffff;
  --ink: #18202b;
  --muted: #667085;
  --line: #d8dee8;
  --accent: #0f766e;
  --accent-soft: #d9f4ee;
  --warn: #9a3412;
  --warn-soft: #ffedd5;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.45;
}
button, input, select { font: inherit; }
main { max-width: 1380px; margin: 0 auto; padding: 24px; }
header { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 18px; }
h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: 0; }
h2 { margin: 24px 0 10px; font-size: 16px; letter-spacing: 0; }
h3 { margin: 0 0 10px; font-size: 14px; letter-spacing: 0; }
.subtle, .muted { color: var(--muted); }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(140px, 1fr)); gap: 10px; }
.metric { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; min-height: 82px; }
.metric span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px; }
.metric strong { display: block; font-size: 22px; letter-spacing: 0; overflow-wrap: anywhere; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: start; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
.controls { display: grid; grid-template-columns: minmax(220px, 1fr) 180px 180px 180px; gap: 10px; margin-bottom: 12px; }
.controls input, .controls select { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; background: #fff; color: var(--ink); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 9px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { color: var(--muted); font-size: 12px; font-weight: 700; background: #eef2f6; position: sticky; top: 0; }
tr:last-child td { border-bottom: 0; }
tr[data-selected="true"] { background: var(--accent-soft); }
.name { min-width: 250px; font-weight: 650; }
.id { color: var(--muted); font-size: 12px; margin-top: 3px; }
.pill { display: inline-flex; align-items: center; min-height: 22px; border-radius: 999px; padding: 2px 8px; background: #eef2f6; color: #344054; font-size: 12px; white-space: nowrap; }
.pill.warn { background: var(--warn-soft); color: var(--warn); }
.bar { width: 100%; min-width: 100px; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin-top: 6px; }
.bar > span { display: block; height: 100%; background: var(--accent); }
.caveats { display: grid; gap: 8px; margin: 12px 0; }
.caveat { border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px; background: #fff; color: var(--muted); }
.caveat.warning { border-color: #fed7aa; background: #fff7ed; color: var(--warn); }
.tasks { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.task-button, .artifact-button, .raw-button { border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 6px; padding: 7px 9px; cursor: pointer; text-align: left; }
.task-button[aria-pressed="true"], .artifact-button:hover, .raw-button:hover { border-color: var(--accent); background: var(--accent-soft); }
.detail { position: sticky; top: 16px; max-height: calc(100vh - 32px); overflow: auto; }
.detail-section { margin-top: 14px; }
.kv { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 6px 10px; padding: 5px 0; border-bottom: 1px solid #eef2f6; }
.kv span:first-child { color: var(--muted); }
.kv span:last-child { overflow-wrap: anywhere; }
.hidden-field { color: var(--warn); }
.empty { padding: 18px; color: var(--muted); text-align: center; border: 1px dashed var(--line); border-radius: 8px; }
@media (max-width: 1050px) {
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .layout { grid-template-columns: 1fr; }
  .detail { position: static; max-height: none; }
}
@media (max-width: 720px) {
  main { padding: 16px; }
  header { display: block; }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .controls { grid-template-columns: 1fr; }
  table { display: block; overflow-x: auto; }
}
`;

export const DASHBOARD_SCRIPT = `
(() => {
  const state = {
    task: new URLSearchParams(location.hash.slice(1)).get("task") || "",
    artifact: new URLSearchParams(location.hash.slice(1)).get("artifact") || "",
    category: "",
    search: "",
    sort: "estimated_uncached"
  };
  const rows = Array.from(document.querySelectorAll("[data-artifact-row]"));
  const detail = document.querySelector("[data-detail]");
  const empty = document.querySelector("[data-empty]");
  const search = document.querySelector("[data-filter-search]");
  const category = document.querySelector("[data-filter-category]");
  const sort = document.querySelector("[data-filter-sort]");
  const taskButtons = Array.from(document.querySelectorAll("[data-task-filter]"));

  function syncHash() {
    const params = new URLSearchParams();
    if (state.task) params.set("task", state.task);
    if (state.artifact) params.set("artifact", state.artifact);
    history.replaceState(null, "", params.toString() ? "#" + params.toString() : location.pathname + location.search);
  }

  function applyFilters() {
    let visible = 0;
    for (const row of rows) {
      const matchesTask = !state.task || row.dataset.taskGroups.split(" ").includes(state.task);
      const matchesCategory = !state.category || row.dataset.category === state.category;
      const matchesSearch = !state.search || row.dataset.search.includes(state.search.toLowerCase());
      const show = matchesTask && matchesCategory && matchesSearch;
      row.hidden = !show;
      row.dataset.selected = row.dataset.artifactId === state.artifact ? "true" : "false";
      if (show) visible += 1;
    }
    if (empty) empty.hidden = visible > 0;
    for (const button of taskButtons) button.setAttribute("aria-pressed", button.dataset.taskFilter === state.task ? "true" : "false");
  }

  function sortRows() {
    const tbody = document.querySelector("[data-artifact-body]");
    if (!tbody) return;
    const key = state.sort || "estimated_uncached";
    rows.sort((a, b) => Number(b.dataset[key] || 0) - Number(a.dataset[key] || 0) || String(a.dataset.artifactId).localeCompare(String(b.dataset.artifactId)));
    for (const row of rows) tbody.appendChild(row);
  }

  function openDetail(artifactId) {
    const template = document.querySelector(\`template[data-detail-template="\${CSS.escape(artifactId)}"]\`);
    state.artifact = artifactId;
    if (detail && template) detail.innerHTML = template.innerHTML;
    applyFilters();
    syncHash();
  }

  search?.addEventListener("input", () => {
    state.search = search.value;
    applyFilters();
  });
  category?.addEventListener("change", () => {
    state.category = category.value;
    applyFilters();
  });
  sort?.addEventListener("change", () => {
    state.sort = sort.value;
    sortRows();
    applyFilters();
  });
  for (const button of taskButtons) {
    button.addEventListener("click", () => {
      state.task = button.dataset.taskFilter === state.task ? "" : button.dataset.taskFilter;
      applyFilters();
      syncHash();
    });
  }
  for (const row of rows) {
    row.addEventListener("click", () => openDetail(row.dataset.artifactId));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail(row.dataset.artifactId);
      }
    });
  }
  detail?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches("[data-raw-reveal]")) return;
    const raw = target.parentElement?.querySelector("[data-raw-content]");
    if (raw) raw.hidden = false;
    target.hidden = true;
  });
  sortRows();
  if (state.artifact) openDetail(state.artifact);
  applyFilters();
})();
`;
