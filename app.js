/**
 * app.js — Core application logic
 */
'use strict';

// ── Tab management ──────────────────────────────────────────────────────────
function initTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function initSidebar() {
  const list = document.getElementById('table-list');
  if (!list) return;
  const tableNames = DB_ENGINE.getTableNames();
  list.innerHTML = '';
  tableNames.forEach((name, i) => {
    const rowCount = DB_ENGINE.getTableRowCount(name);
    const icon     = DB_ENGINE.getTableIcon(name);
    const item     = document.createElement('div');
    item.className = 'table-item animate-in';
    item.style.animationDelay = `${i * 0.07}s`;
    item.innerHTML = `
      <span class="tbl-icon">${icon}</span>
      <span class="tbl-name">${name}</span>
      <span class="tbl-rows">${rowCount} rows</span>`;
    item.addEventListener('click', () => {
      document.querySelectorAll('.table-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      showSchema(name);
      const sel = document.getElementById('table-select');
      if (sel) { sel.value = name; sel.dispatchEvent(new Event('change')); }
      document.querySelector('[data-tab="tab-builder"]')?.click();
    });
    list.appendChild(item);
  });
}

// ── Schema panel ─────────────────────────────────────────────────────────────
function showSchema(tableName) {
  const panel = document.getElementById('schema-panel');
  if (!panel) return;
  const cols = DB_ENGINE.getSchema(tableName);
  panel.innerHTML = `<div class="schema-title">📐 ${tableName}</div>`;
  cols.forEach(col => {
    const div = document.createElement('div');
    div.className = 'schema-col';
    div.innerHTML = `
      <span class="schema-col-name">${col.name}</span>
      <span class="schema-col-type">${col.type}</span>
      ${col.key ? `<span class="schema-col-key">${col.key}</span>` : ''}`;
    panel.appendChild(div);
  });
}

// ── Results rendering ─────────────────────────────────────────────────────────
function renderResults({ success, columns, rows, error, elapsed, rowCount }) {
  const meta  = document.getElementById('results-meta');
  const body  = document.getElementById('results-body');
  const head  = document.getElementById('results-head');
  const empty = document.getElementById('results-empty');
  const wrap  = document.getElementById('results-table-wrap');

  if (!success) {
    meta.innerHTML = `<span class="meta-badge red">❌ Error — ${elapsed}ms</span>`;
    wrap.style.display = 'none';
    empty.style.display = 'flex';
    empty.innerHTML = `<div class="empty-icon">💥</div><div class="empty-text" style="color:var(--red)">${error}</div>`;
    document.querySelector('[data-tab="tab-results"]')?.click();
    return;
  }

  meta.innerHTML = `
    <span class="meta-badge green">✅ Success</span>
    <span class="meta-badge blue">📊 ${rowCount} row${rowCount !== 1 ? 's' : ''}</span>
    <span class="meta-badge blue">⏱ ${elapsed}ms</span>`;

  if (rows.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'flex';
    empty.innerHTML = `<div class="empty-icon">🔍</div><div class="empty-text">No rows matched your query.</div>`;
    document.querySelector('[data-tab="tab-results"]')?.click();
    return;
  }

  head.innerHTML = '<tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
  body.innerHTML = rows.map(row =>
    '<tr>' + row.map(cell =>
      cell === null ? '<td><span class="null-val">NULL</span></td>' : `<td>${cell}</td>`
    ).join('') + '</tr>'
  ).join('');
  wrap.style.display = '';
  empty.style.display = 'none';
  document.querySelector('[data-tab="tab-results"]')?.click();
}

// ── Direct SQL editor ─────────────────────────────────────────────────────────
function initDirectSQL() {
  const runBtn  = document.getElementById('run-direct-sql');
  const editor  = document.getElementById('sql-editable');
  if (!runBtn || !editor) return;
  runBtn.addEventListener('click', () => {
    const sql = editor.value.trim();
    if (!sql) return;
    const result = DB_ENGINE.runQuery(sql);
    renderResults(result);
  });
}

// ── Glossary ──────────────────────────────────────────────────────────────────
const GLOSSARY = [
  { term:'SELECT',       def:'Picks which columns to show. Like choosing which info to read.',           example:'SELECT name, age FROM students;' },
  { term:'FROM',         def:'Specifies which table the data comes from.',                               example:'SELECT * FROM courses;' },
  { term:'WHERE',        def:'Filters rows — only those matching the condition are returned.',           example:"SELECT * FROM students WHERE grade = 'A';" },
  { term:'ORDER BY',     def:'Sorts results. ASC = smallest first, DESC = largest first.',              example:'SELECT name FROM students ORDER BY age ASC;' },
  { term:'LIMIT',        def:'Restricts how many rows come back. Useful for huge tables.',              example:'SELECT * FROM students LIMIT 5;' },
  { term:'PRIMARY KEY',  def:'A unique ID column — no two rows can share the same value.',             example:'id INTEGER PRIMARY KEY' },
  { term:'FOREIGN KEY',  def:'A column that links to another table\'s Primary Key.',                   example:'course_id → courses(id)' },
  { term:'LIKE',         def:'Matches partial text. % means "any characters" in between.',             example:"SELECT * FROM students WHERE name LIKE '%Sharma%';" },
  { term:'NULL',         def:'"No value" — different from 0 or empty text. Means unknown.',           example:'SELECT * FROM students WHERE email IS NOT NULL;' },
  { term:'COUNT(*)',     def:'Counts how many rows exist in the result.',                               example:'SELECT COUNT(*) FROM students;' },
  { term:'JOIN',         def:'Combines rows from two tables that share a related column.',             example:'SELECT s.name, c.title FROM students s JOIN enrollments e ON s.id=e.student_id;' },
];

function initGlossary() {
  const btn    = document.getElementById('glossary-btn');
  const drawer = document.getElementById('glossary-drawer');
  const close  = document.getElementById('close-glossary');
  const items  = document.getElementById('glossary-items');
  if (!btn || !drawer) return;
  if (items) {
    items.innerHTML = GLOSSARY.map(g => `
      <div class="gloss-item">
        <div class="gloss-term">${g.term}</div>
        <div class="gloss-def">${g.def}</div>
        <div class="gloss-example">${g.example}</div>
      </div>`).join('');
  }
  btn.addEventListener('click', (e) => { e.stopPropagation(); drawer.classList.toggle('open'); });
  close?.addEventListener('click', () => drawer.classList.remove('open'));
  document.addEventListener('click', e => {
    if (!drawer.contains(e.target) && e.target !== btn) drawer.classList.remove('open');
  });
}

// ── Welcome modal ──────────────────────────────────────────────────────────────
function initModal() {
  const modal  = document.getElementById('welcome-modal');
  const getBtn = document.getElementById('modal-start-btn');
  if (!modal || !getBtn) return;
  getBtn.addEventListener('click', () => modal.classList.add('hidden'));
}

// ── Loading overlay ───────────────────────────────────────────────────────────
function showLoading(on) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = on ? 'flex' : 'none';
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  showLoading(true);
  try {
    await DB_ENGINE.init();
  } catch (e) {
    console.error('DB init failed:', e);
    showLoading(false);
    document.getElementById('loading-overlay').innerHTML =
      '<div style="color:var(--red);text-align:center"><div style="font-size:2rem">⚠️</div><br>Failed to load database engine.<br><small>Check your internet connection (need CDN).</small></div>';
    return;
  }
  showLoading(false);

  initTabs();
  initSidebar();
  initGlossary();
  initModal();
  initDirectSQL();

  const tables = DB_ENGINE.getTableNames();
  if (tables.length > 0) showSchema(tables[0]);

  QUERY_BUILDER.init({
    onRun(sql) {
      const result = DB_ENGINE.runQuery(sql);
      renderResults(result);
    },
  });
  QUERY_BUILDER.populateTableDropdown(tables);
}

document.addEventListener('DOMContentLoaded', boot);
