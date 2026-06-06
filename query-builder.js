/**
 * query-builder.js — Visual step-by-step SQL query builder
 * Generates SQL from UI selections and previews it live
 */

'use strict';

const QUERY_BUILDER = (() => {

  // Current builder state
  let state = {
    table: '',
    columns: [],        // [] = SELECT *
    conditions: [],     // [{ col, op, val }]
    orderBy: '',
    orderDir: 'ASC',
    limit: 100,
  };

  // Live SQL updater callback (set by app.js)
  let onSQLChange = null;
  let onRun = null;

  // ── SQL Generation ─────────────────────────────────────────────────────────

  function buildSQL() {
    if (!state.table) return '';

    const cols = state.columns.length > 0
      ? state.columns.join(', ')
      : '*';

    let sql = `SELECT ${cols}\nFROM   ${state.table}`;

    if (state.conditions.length > 0) {
      const whereParts = state.conditions
        .filter(c => c.col && c.op && c.val !== '')
        .map(c => {
          const valNum = !isNaN(c.val) && c.val !== '';
          const val = (c.op === 'LIKE' || c.op === 'NOT LIKE')
            ? `'%${c.val}%'`
            : valNum ? c.val : `'${c.val}'`;
          return `       ${c.col} ${c.op} ${val}`;
        });
      if (whereParts.length > 0) {
        sql += `\nWHERE  (\n${whereParts.join('\n  AND ')}\n       )`;
      }
    }

    if (state.orderBy) {
      sql += `\nORDER BY ${state.orderBy} ${state.orderDir}`;
    }

    sql += `\nLIMIT  ${state.limit};`;
    return sql;
  }

  function notifyChange() {
    const sql = buildSQL();
    if (onSQLChange) onSQLChange(sql);
    updateSQLPreviewTab(sql);
    updateStepDots();
  }

  // ── SQL Syntax Highlighting ────────────────────────────────────────────────

  function highlightSQL(raw) {
    const keywords = ['SELECT','FROM','WHERE','ORDER BY','LIMIT','AND','OR','NOT LIKE','LIKE','IN','IS','NULL','ASC','DESC'];
    let h = raw;

    // Escape HTML
    h = h.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // Keywords
    keywords.forEach(kw => {
      h = h.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span class="sql-kw">${kw}</span>`);
    });

    // Strings
    h = h.replace(/'([^']*)'/g, `<span class="sql-val">'$1'</span>`);

    // Numbers
    h = h.replace(/\b(\d+\.?\d*)\b/g, `<span class="sql-val">$1</span>`);

    // Operators
    h = h.replace(/\b(=|!=|>=?|<=?)\b/g, `<span class="sql-op">$1</span>`);

    return h;
  }

  function updateSQLPreviewTab(sql) {
    const el = document.getElementById('sql-preview-code');
    if (!el) return;
    if (!sql) {
      el.innerHTML = '<span style="color:var(--text-muted);font-style:italic;">-- Your query will appear here as you build it...</span>';
      return;
    }
    el.innerHTML = highlightSQL(sql);
  }

  // ── Step Dots ─────────────────────────────────────────────────────────────

  function updateStepDots() {
    const steps = [
      { id: 'step-dot-1', done: !!state.table },
      { id: 'step-dot-2', done: true },
      { id: 'step-dot-3', done: true },
      { id: 'step-dot-4', done: true },
      { id: 'step-dot-5', done: true },
    ];
    steps.forEach(({ id, done }, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'done');
      if (done && state.table) el.classList.add('done');
    });
    // Active is always the first unfilled step
    const first = document.getElementById('step-dot-1');
    if (first && !state.table) { first.classList.add('active'); first.classList.remove('done'); }
  }

  // ── Step 1: Table selection ────────────────────────────────────────────────

  function initTableSelect() {
    const sel = document.getElementById('table-select');
    if (!sel) return;

    sel.addEventListener('change', () => {
      state.table = sel.value;
      state.columns = [];
      state.conditions = [];
      state.orderBy = '';
      if (state.table) {
        populateColumnChecks();
        populateFilterColumns();
        populateSortColumns();
        enableBuilder(true);
      } else {
        enableBuilder(false);
      }
      notifyChange();
    });
  }

  function enableBuilder(on) {
    ['col-grid-container','filter-section','sort-section','limit-section','run-section']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.opacity = on ? '1' : '0.3';
      });
    const btn = document.getElementById('run-btn');
    if (btn) btn.disabled = !on;
  }

  // ── Step 2: Column checkboxes ──────────────────────────────────────────────

  function populateColumnChecks() {
    const grid = document.getElementById('col-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const cols = DB_ENGINE.getSchema(state.table);

    cols.forEach(col => {
      const label = document.createElement('label');
      label.className = 'col-check';
      label.innerHTML = `
        <input type="checkbox" value="${col.name}" checked>
        <span class="check-box"></span>
        <span class="col-label">${col.name}</span>
      `;
      label.querySelector('input').addEventListener('change', () => {
        const checked = grid.querySelectorAll('input:checked');
        state.columns = Array.from(checked).map(c => c.value);
        notifyChange();
      });
      grid.appendChild(label);
    });

    // Default: all checked = SELECT *
    state.columns = [];
    notifyChange();
  }

  // ── Step 3: WHERE conditions ───────────────────────────────────────────────

  function populateFilterColumns() {
    // Populate existing condition dropdowns
    document.querySelectorAll('.cond-col-sel').forEach(sel => {
      fillColumnSelect(sel);
    });
  }

  function fillColumnSelect(sel) {
    const cols = DB_ENGINE.getSchema(state.table);
    sel.innerHTML = '<option value="">-- Column --</option>' +
      cols.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }

  function addCondition() {
    const list = document.getElementById('conditions-list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'condition-row animate-in';

    const colSel = document.createElement('select');
    colSel.className = 'form-select cond-col-sel';
    fillColumnSelect(colSel);

    const opSel = document.createElement('select');
    opSel.className = 'form-select';
    ['=','!=','>','>=','<','<=','LIKE','NOT LIKE'].forEach(op => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = op;
      opSel.appendChild(opt);
    });

    const valIn = document.createElement('input');
    valIn.className = 'form-input';
    valIn.placeholder = 'Value…';
    valIn.type = 'text';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-cond';
    removeBtn.textContent = '✕';

    const updateCond = () => {
      const idx = Array.from(list.children).indexOf(row);
      if (idx === -1) return;
      state.conditions[idx] = { col: colSel.value, op: opSel.value, val: valIn.value };
      notifyChange();
    };

    colSel.addEventListener('change', updateCond);
    opSel.addEventListener('change', updateCond);
    valIn.addEventListener('input', updateCond);
    removeBtn.addEventListener('click', () => {
      const idx = Array.from(list.children).indexOf(row);
      state.conditions.splice(idx, 1);
      row.remove();
      notifyChange();
    });

    row.appendChild(colSel);
    row.appendChild(opSel);
    row.appendChild(valIn);
    row.appendChild(removeBtn);
    list.appendChild(row);

    const idx = list.children.length - 1;
    state.conditions.push({ col: '', op: '=', val: '' });
  }

  // ── Step 4: ORDER BY ──────────────────────────────────────────────────────

  function populateSortColumns() {
    const sortSel = document.getElementById('sort-col');
    if (!sortSel) return;
    const cols = DB_ENGINE.getSchema(state.table);
    sortSel.innerHTML = '<option value="">-- None --</option>' +
      cols.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }

  function initSortControls() {
    const sortSel = document.getElementById('sort-col');
    const dirSel  = document.getElementById('sort-dir');
    if (sortSel) sortSel.addEventListener('change', () => {
      state.orderBy = sortSel.value;
      notifyChange();
    });
    if (dirSel) dirSel.addEventListener('change', () => {
      state.orderDir = dirSel.value;
      notifyChange();
    });
  }

  // ── Step 5: LIMIT ─────────────────────────────────────────────────────────

  function initLimitControl() {
    const range = document.getElementById('limit-range');
    const disp  = document.getElementById('limit-display');
    if (!range) return;
    range.addEventListener('input', () => {
      state.limit = range.value;
      if (disp) disp.textContent = range.value;
      notifyChange();
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    state = { table: '', columns: [], conditions: [], orderBy: '', orderDir: 'ASC', limit: 100 };
    const tableSelect = document.getElementById('table-select');
    if (tableSelect) tableSelect.value = '';
    const colGrid = document.getElementById('col-grid');
    if (colGrid) colGrid.innerHTML = '';
    const condList = document.getElementById('conditions-list');
    if (condList) condList.innerHTML = '';
    const sortCol = document.getElementById('sort-col');
    if (sortCol) sortCol.innerHTML = '<option value="">-- None --</option>';
    const range = document.getElementById('limit-range');
    if (range) range.value = 100;
    const disp = document.getElementById('limit-display');
    if (disp) disp.textContent = '100';
    enableBuilder(false);
    notifyChange();
  }

  // ── Public init ───────────────────────────────────────────────────────────

  function init(opts = {}) {
    onSQLChange = opts.onSQLChange || null;
    onRun = opts.onRun || null;

    initTableSelect();
    initSortControls();
    initLimitControl();

    document.getElementById('add-condition-btn')?.addEventListener('click', addCondition);
    document.getElementById('run-btn')?.addEventListener('click', () => {
      const sql = buildSQL();
      if (sql && onRun) onRun(sql);
    });
    document.getElementById('reset-btn')?.addEventListener('click', reset);

    enableBuilder(false);
    updateSQLPreviewTab('');
  }

  function getCurrentSQL() { return buildSQL(); }

  function populateTableDropdown(tableNames) {
    const sel = document.getElementById('table-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Choose a table --</option>' +
      tableNames.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  return { init, getCurrentSQL, populateTableDropdown, reset, highlightSQL };
})();
