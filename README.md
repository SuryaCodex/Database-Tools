# 🗄️ SQL Explorer — Beginner Database Access Tool

> A fully client-side, interactive SQL learning environment built with vanilla JavaScript and WebAssembly. No backend, no installation, no SQL knowledge required to get started.

---

## 📌 Project Overview

SQL Explorer is a browser-based tool that lets anyone — especially beginners — explore, query, and understand relational databases without writing a single line of SQL. It ships with a preloaded school management database and offers a visual step-by-step query builder, a live SQL preview, a direct SQL editor for advanced users, and a built-in SQL glossary.

The entire application runs inside the browser using **sql.js** (SQLite compiled to WebAssembly), meaning there is zero server dependency. Data never leaves the user's machine.

---

## ✨ Features

- **Visual Query Builder** — A guided 5-step form (choose table → pick columns → filter rows → sort → limit) that builds valid SQL automatically
- **Live SQL Preview** — Syntax-highlighted SQL updates in real time as the user interacts with the builder
- **Direct SQL Editor** — Advanced users can write and execute any arbitrary SQL query
- **Results Table** — Query output rendered as a clean paginated-style table with row count and execution time metadata
- **Schema Panel** — Shows column names, data types, and key annotations (PK / FK) for the selected table
- **SQL Glossary Drawer** — Beginner-friendly definitions and usage examples for common SQL keywords
- **Welcome Modal** — Onboarding screen that explains the three main steps to new users
- **Fully Offline** — Runs entirely in the browser; no server, no database connection string needed
- **Animated UI** — Smooth CSS entrance animations and interactive state transitions

---

## 🗂️ Project Structure

```
sql-explorer/
├── index.html          # App shell, HTML structure, modal, glossary drawer, tab layout
├── style.css           # All styling — layout, theme, animations, component styles
├── db-engine.js        # sql.js wrapper, sample data seeding, query execution
├── query-builder.js    # Visual builder logic, SQL generation, live preview
└── app.js              # Boot sequence, tab/sidebar/glossary/modal initialization
```

---

## 🏗️ Architecture Overview

The project follows a **modular IIFE (Immediately Invoked Function Expression)** pattern — each JS file exposes a single global object with a clean public API.

```
index.html
    │
    ├── loads sql-wasm.js  (CDN — SQLite compiled to WASM)
    │
    ├── db-engine.js   → exposes: DB_ENGINE
    │       • Wraps sql.js
    │       • Seeds the in-memory SQLite database with SAMPLE_SQL on init()
    │       • Exposes: init(), runQuery(sql), getTableNames(),
    │                  getSchema(table), getTableIcon(table), getTableRowCount(table)
    │
    ├── query-builder.js  → exposes: QUERY_BUILDER
    │       • Manages builder UI state (table, columns, conditions, order, limit)
    │       • Generates SQL string from state via buildSQL()
    │       • Updates live SQL preview with syntax highlighting
    │       • Exposes: init(opts), getCurrentSQL(), populateTableDropdown(),
    │                  reset(), highlightSQL(raw)
    │
    └── app.js
            • Boot function wires everything together after DB_ENGINE.init() resolves
            • Manages tabs, sidebar, schema panel, glossary drawer, welcome modal
            • Delegates query execution to DB_ENGINE.runQuery()
            • Renders results via renderResults()
```

### Data Flow

```
User interacts with Query Builder UI
        ↓
QUERY_BUILDER.buildSQL()  →  SQL string
        ↓
DB_ENGINE.runQuery(sql)   →  { success, columns, rows, elapsed, rowCount }
        ↓
app.js renderResults()    →  Results Tab (table / empty state / error)
```

### Database Layer

sql.js loads SQLite as a `.wasm` binary from the Cloudflare CDN at startup. `DB_ENGINE.init()` returns a Promise; the app boots only after it resolves. The database is entirely **in-memory** — data resets on page reload by design.

---

## 🗃️ Sample Database Schema

The app ships with four related tables representing a school management system:

| Table | Description | Rows |
|---|---|---|
| `students` | Student profiles with grade and city | 10 |
| `teachers` | Teacher profiles with subject and experience | 5 |
| `courses` | Course catalogue linked to teachers | 7 |
| `enrollments` | Student–course joins with scores and semester | 15 |

**Relationships:**
- `courses.teacher_id` → `teachers.id`
- `enrollments.student_id` → `students.id`
- `enrollments.course_id` → `courses.id`

---

## ⚙️ How It Works — Step by Step

### Boot Sequence (`app.js → boot()`)
1. Loading overlay is shown
2. `DB_ENGINE.init()` is called — fetches `sql-wasm.wasm` from CDN, creates in-memory SQLite DB, runs `SAMPLE_SQL` to seed tables
3. Overlay is hidden
4. All UI modules are initialized: tabs, sidebar, glossary, modal, direct SQL editor
5. `QUERY_BUILDER.init()` is called with an `onRun` callback that pipes SQL to `DB_ENGINE.runQuery()`
6. Table dropdown is populated; first table's schema is displayed

### Query Builder Flow (`query-builder.js`)
1. User selects a table → `state.table` is set, column checkboxes and sort/filter dropdowns are populated
2. User ticks/unticks columns → `state.columns` array is updated (`[]` = `SELECT *`)
3. User adds WHERE conditions → each row appends `{ col, op, val }` to `state.conditions`
4. User picks sort column and direction → `state.orderBy` / `state.orderDir` updated
5. User adjusts the limit slider → `state.limit` updated
6. After every change, `notifyChange()` calls `buildSQL()` and pushes the result to the SQL Preview tab via `updateSQLPreviewTab()`
7. On Run button click → `buildSQL()` result is passed to the `onRun` callback

### SQL Generation (`buildSQL()`)
```
SELECT <cols>
FROM   <table>
WHERE  ( <conditions joined with AND> )
ORDER BY <col> <dir>
LIMIT  <n>;
```
Numeric values are inserted unquoted; string values are wrapped in single quotes; `LIKE` / `NOT LIKE` values are automatically wrapped in `%…%`.

---

## 🚀 Getting Started

### Option 1 — Open directly
No build step needed. Just open `index.html` in any modern browser.

> ⚠️ The browser must be able to load `sql-wasm.wasm` from the Cloudflare CDN (`cdnjs.cloudflare.com`). An internet connection is required on first load.

### Option 2 — Serve locally (recommended)
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```
Then open `http://localhost:8080` in your browser.

### Option 3 — GitHub Pages
Push the repository to GitHub and enable GitHub Pages from the `main` branch root. The app will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **sql.js 1.10.2** | SQLite compiled to WebAssembly — runs a real SQL engine in the browser |
| **Vanilla JavaScript (ES5 strict)** | All app logic — no frameworks |
| **HTML5 / CSS3** | UI structure and styling |
| **CSS Custom Properties** | Theming and consistent design tokens |
| **CSS Animations** | Entrance animations (`animate-in` keyframes) |
| **Web APIs** | `performance.now()` for query timing, DOM APIs for rendering |

---

## 🔮 Planned Improvements

- [ ] **JOIN query support** in the visual builder (multi-table queries)
- [ ] **Aggregate functions** — COUNT, AVG, MAX, MIN with GROUP BY
- [ ] **Export results** to CSV / JSON download
- [ ] **Query history** — save and replay past queries in the session
- [ ] **Dark / light mode toggle**
- [ ] **Custom data import** — allow users to upload their own CSV and query it
- [ ] **Mobile responsive layout** improvements
- [ ] **Persistent storage** using IndexedDB so the database survives page reload
- [ ] **More sample datasets** — e-commerce, hospital, library themes

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome. Please open an issue before submitting a pull request for large changes.

---

## 📄 License

This project is open source. See `LICENSE` for details.

---

*Built as a learning tool for students exploring SQL and relational databases for the first time.*

