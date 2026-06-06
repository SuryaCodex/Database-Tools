/**
 * db-engine.js — sql.js wrapper + sample database bootstrapper
 * Uses sql.js (SQLite compiled to WASM) loaded from CDN
 */

'use strict';

const DB_ENGINE = (() => {

  let db = null;

  // ── Sample data ────────────────────────────────────────────────────────────

  const SAMPLE_SQL = `
    CREATE TABLE IF NOT EXISTS students (
      id      INTEGER PRIMARY KEY,
      name    TEXT    NOT NULL,
      age     INTEGER,
      grade   TEXT,
      email   TEXT,
      city    TEXT
    );
    INSERT INTO students VALUES
      (1,  'Aarav Sharma',    19, 'A',  'aarav@edu.in',    'Delhi'),
      (2,  'Priya Patel',     20, 'B+', 'priya@edu.in',    'Mumbai'),
      (3,  'Rohan Singh',     18, 'A+', 'rohan@edu.in',    'Pune'),
      (4,  'Sneha Iyer',      21, 'B',  'sneha@edu.in',    'Chennai'),
      (5,  'Karan Mehta',     19, 'A',  'karan@edu.in',    'Jaipur'),
      (6,  'Ananya Nair',     22, 'A+', 'ananya@edu.in',   'Kochi'),
      (7,  'Vikram Das',      20, 'C+', 'vikram@edu.in',   'Kolkata'),
      (8,  'Meera Reddy',     18, 'B+', 'meera@edu.in',    'Hyderabad'),
      (9,  'Arjun Verma',     21, 'A',  'arjun@edu.in',    'Lucknow'),
      (10, 'Pooja Joshi',     19, 'B',  'pooja@edu.in',    'Ahmedabad');

    CREATE TABLE IF NOT EXISTS teachers (
      id               INTEGER PRIMARY KEY,
      name             TEXT    NOT NULL,
      subject          TEXT,
      experience_years INTEGER,
      email            TEXT
    );
    INSERT INTO teachers VALUES
      (1, 'Dr. Ramesh Gupta',   'Mathematics',      12, 'rgupta@school.in'),
      (2, 'Ms. Lata Sharma',    'English',           8,  'lsharma@school.in'),
      (3, 'Mr. Suresh Kumar',   'Physics',          15,  'skumar@school.in'),
      (4, 'Dr. Anita Rao',      'Computer Science',  6,  'arao@school.in'),
      (5, 'Mr. Deepak Nair',    'Chemistry',        10,  'dnair@school.in');

    CREATE TABLE IF NOT EXISTS courses (
      id       INTEGER PRIMARY KEY,
      title    TEXT    NOT NULL,
      credits  INTEGER,
      teacher_id INTEGER
    );
    INSERT INTO courses VALUES
      (1, 'Mathematics 101',    4, 1),
      (2, 'English Literature', 3, 2),
      (3, 'Physics Fundamentals',4,3),
      (4, 'Introduction to CS', 3, 4),
      (5, 'Organic Chemistry',  4, 5),
      (6, 'Advanced Maths',     4, 1),
      (7, 'Creative Writing',   2, 2);

    CREATE TABLE IF NOT EXISTS enrollments (
      id         INTEGER PRIMARY KEY,
      student_id INTEGER,
      course_id  INTEGER,
      score      REAL,
      semester   TEXT
    );
    INSERT INTO enrollments VALUES
      (1,  1, 1, 88.5, 'Spring 2024'),
      (2,  1, 3, 91.0, 'Spring 2024'),
      (3,  2, 2, 76.5, 'Spring 2024'),
      (4,  2, 4, 82.0, 'Spring 2024'),
      (5,  3, 1, 95.5, 'Spring 2024'),
      (6,  3, 5, 89.0, 'Spring 2024'),
      (7,  4, 2, 73.0, 'Spring 2024'),
      (8,  4, 6, 66.5, 'Spring 2024'),
      (9,  5, 4, 90.0, 'Spring 2024'),
      (10, 6, 3, 97.0, 'Spring 2024'),
      (11, 7, 1, 55.0, 'Spring 2024'),
      (12, 8, 7, 88.0, 'Spring 2024'),
      (13, 9, 5, 79.5, 'Spring 2024'),
      (14,10, 2, 84.0, 'Spring 2024'),
      (15, 5, 6, 92.0, 'Spring 2024');
  `;

  // Schema metadata
  const SCHEMA = {
    students: [
      { name: 'id',    type: 'INTEGER', key: 'PK' },
      { name: 'name',  type: 'TEXT' },
      { name: 'age',   type: 'INTEGER' },
      { name: 'grade', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'city',  type: 'TEXT' },
    ],
    teachers: [
      { name: 'id',               type: 'INTEGER', key: 'PK' },
      { name: 'name',             type: 'TEXT' },
      { name: 'subject',          type: 'TEXT' },
      { name: 'experience_years', type: 'INTEGER' },
      { name: 'email',            type: 'TEXT' },
    ],
    courses: [
      { name: 'id',         type: 'INTEGER', key: 'PK' },
      { name: 'title',      type: 'TEXT' },
      { name: 'credits',    type: 'INTEGER' },
      { name: 'teacher_id', type: 'INTEGER', key: 'FK' },
    ],
    enrollments: [
      { name: 'id',         type: 'INTEGER', key: 'PK' },
      { name: 'student_id', type: 'INTEGER', key: 'FK' },
      { name: 'course_id',  type: 'INTEGER', key: 'FK' },
      { name: 'score',      type: 'REAL' },
      { name: 'semester',   type: 'TEXT' },
    ],
  };

  const TABLE_ICONS = {
    students: '🎓',
    teachers: '👩‍🏫',
    courses: '📚',
    enrollments: '📋',
  };

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    // initSqlJs loaded from CDN in index.html
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    db = new SQL.Database();
    db.run(SAMPLE_SQL);
    return true;
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  function runQuery(sql) {
    if (!db) throw new Error('Database not initialized.');
    const start = performance.now();
    let columns = [];
    let rows = [];
    try {
      const results = db.exec(sql);
      const elapsed = (performance.now() - start).toFixed(1);
      if (results.length > 0) {
        columns = results[0].columns;
        rows    = results[0].values;
      }
      return { success: true, columns, rows, elapsed, rowCount: rows.length };
    } catch (e) {
      return { success: false, error: e.message, elapsed: (performance.now() - start).toFixed(1) };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getTableNames() {
    return Object.keys(SCHEMA);
  }

  function getSchema(table) {
    return SCHEMA[table] || [];
  }

  function getTableIcon(table) {
    return TABLE_ICONS[table] || '🗄️';
  }

  function getTableRowCount(table) {
    if (!db) return '?';
    try {
      const r = db.exec(`SELECT COUNT(*) FROM ${table}`);
      return r[0].values[0][0];
    } catch { return '?'; }
  }

  return { init, runQuery, getTableNames, getSchema, getTableIcon, getTableRowCount };
})();
