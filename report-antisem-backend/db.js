/**
 * db.js — PostgreSQL database layer
 *
 * Replaces the JSON file "database" with a real PostgreSQL connection.
 * Set your connection string in the .env file:
 *
 *   DATABASE_URL=postgresql://user:password@localhost:5432/reportasa
 *
 * OR set individual vars:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 */

const { Pool } = require("pg");

// ── Connection pool ───────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If DATABASE_URL is not set, pg falls back to individual PG* env vars
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }  // required for most hosted Postgres (Heroku, Render, etc.)
    : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

// Convenience wrapper — returns rows from a parameterised query
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

// ── Reports ───────────────────────────────────────────────────────────────────
async function getAllReports() {
  const { rows } = await query("SELECT * FROM reports ORDER BY created_at DESC");
  return rows;
}

async function getReportById(id) {
  const { rows } = await query("SELECT * FROM reports WHERE id = $1", [id]);
  return rows[0] || null;
}

async function createReport(data) {
  const { rows } = await query(
    `INSERT INTO reports
      (type, date, location, org, description, contact, anonymous, links, source, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Under Review')
     RETURNING *`,
    [
      data.type        || "",
      data.date        || null,
      data.location    || "",
      data.org         || "",
      data.description || "",
      data.contact     || "",
      data.anonymous   !== false,
      JSON.stringify(Array.isArray(data.links) ? data.links.filter(Boolean) : []),
      data.source      || "full_form",
    ]
  );
  return rows[0];
}

async function updateReportStatus(id, status) {
  const { rows } = await query(
    "UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] || null;
}

// ── Feed ──────────────────────────────────────────────────────────────────────
async function getFeed() {
  const { rows } = await query("SELECT * FROM feed ORDER BY created_at DESC");
  return rows;
}

async function upsertFeedItem(item) {
  await query(
    `INSERT INTO feed (id, location, type, time, status)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE
       SET location = EXCLUDED.location,
           type     = EXCLUDED.type,
           time     = EXCLUDED.time,
           status   = EXCLUDED.status`,
    [item.id, item.location || "", item.type, item.time || "just now", item.status]
  );

  // Cap feed at 20 items (delete oldest beyond 20)
  await query(
    `DELETE FROM feed WHERE id NOT IN (
       SELECT id FROM feed ORDER BY created_at DESC LIMIT 20
     )`
  );

  return getFeed();
}

async function deleteFeedItem(id) {
  await query("DELETE FROM feed WHERE id = $1", [id]);
  return getFeed();
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function computeStats() {
  const [totalRes, resolvedRes, statesRes, communityRes] = await Promise.all([
    query("SELECT COUNT(*)::int AS total FROM reports"),
    query("SELECT COUNT(*)::int AS resolved FROM reports WHERE status = 'Resolved'"),
    query(`SELECT COUNT(DISTINCT TRIM(SPLIT_PART(location, ',', 2)))::int AS states
           FROM reports WHERE location LIKE '%,%'`),
    query("SELECT value FROM stats_overrides WHERE key = 'community_members'"),
  ]);

  const total    = totalRes.rows[0].total;
  const resolved = resolvedRes.rows[0].resolved;
  const states   = statesRes.rows[0].states;
  const community = communityRes.rows[0]?.value ?? 0;

  return {
    reports_submitted:  total,
    cases_resolved_pct: total > 0 ? Math.round((resolved / total) * 100) : 0,
    states_covered:     states,
    community_members:  Number(community),
  };
}

async function setCommunityMembers(count) {
  await query(
    `INSERT INTO stats_overrides (key, value)
     VALUES ('community_members', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [count]
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function getAllUsers() {
  const { rows } = await query("SELECT * FROM users ORDER BY created_at DESC");
  return rows;
}

async function getUserById(id) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const { rows } = await query(
    "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
    [email]
  );
  return rows[0] || null;
}

async function createUser(data) {
  const { rows } = await query(
    `INSERT INTO users
      (email, password_hash, name, title, department, bio, avatar, role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.email        || "",
      data.passwordHash || "",
      data.name         || "",
      data.title        || "",
      data.department   || "",
      data.bio          || "",
      data.avatar       || "",
      data.role         || "user",
    ]
  );
  return pgUserToJs(rows[0]);
}

async function updateUser(id, updates) {
  // Build SET clause dynamically from allowed fields
  const colMap = {
    name:         "name",
    title:        "title",
    department:   "department",
    bio:          "bio",
    avatar:       "avatar",
    role:         "role",
    lastLoginAt:  "last_login_at",
    passwordHash: "password_hash",
  };

  const sets  = [];
  const vals  = [];
  let   idx   = 1;

  for (const [jsKey, pgCol] of Object.entries(colMap)) {
    if (updates[jsKey] !== undefined) {
      sets.push(`${pgCol} = $${idx++}`);
      vals.push(updates[jsKey]);
    }
  }

  if (sets.length === 0) return getUserById(id);

  vals.push(id);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id = $${idx} RETURNING *`,
    vals
  );
  return rows[0] ? pgUserToJs(rows[0]) : null;
}

// Map snake_case pg columns → camelCase JS (mirrors old JSON shape)
function pgUserToJs(row) {
  if (!row) return null;
  return {
    id:           row.id,
    email:        row.email,
    passwordHash: row.password_hash,
    name:         row.name,
    title:        row.title,
    department:   row.department,
    bio:          row.bio,
    avatar:       row.avatar,
    role:         row.role,
    createdAt:    row.created_at,
    lastLoginAt:  row.last_login_at,
    updatedAt:    row.updated_at,
  };
}

// ── Contact Submissions ───────────────────────────────────────────────────────
async function getAllContactSubmissions() {
  const { rows } = await query(
    "SELECT * FROM contact_submissions ORDER BY created_at DESC"
  );
  return rows;
}

async function createContactSubmission(data) {
  const { rows } = await query(
    `INSERT INTO contact_submissions (name, email, subject, message)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.name || "", data.email || "", data.subject || "", data.message || ""]
  );
  return rows[0];
}

// ── Report Submissions (team → admin review) ──────────────────────────────────
async function getSubmissionsByReport(reportId) {
  const { rows } = await query(
    "SELECT * FROM report_submissions WHERE report_id = $1 ORDER BY created_at DESC",
    [reportId]
  );
  return rows;
}

async function getAllPendingSubmissions() {
  const { rows } = await query(
    `SELECT rs.*, r.type AS report_type, r.location AS report_location
     FROM report_submissions rs
     JOIN reports r ON r.id = rs.report_id
     WHERE rs.status = 'pending'
     ORDER BY rs.created_at ASC`
  );
  return rows;
}

async function getAllSubmissions() {
  const { rows } = await query(
    `SELECT rs.*, r.type AS report_type, r.location AS report_location
     FROM report_submissions rs
     JOIN reports r ON r.id = rs.report_id
     ORDER BY rs.created_at DESC`
  );
  return rows;
}

async function createSubmission(data) {
  const { rows } = await query(
    `INSERT INTO report_submissions
       (report_id, submitted_by, submitter_name, markdown, image_links)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.reportId,
      data.submittedBy,
      data.submitterName || "",
      data.markdown      || "",
      JSON.stringify(Array.isArray(data.imageLinks) ? data.imageLinks.filter(Boolean) : []),
    ]
  );
  return rows[0];
}

async function storeResetToken(userId, jti) {
  // Delete any existing reset tokens for this user first (1 active at a time)
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
 
  await query(
    `INSERT INTO password_reset_tokens (user_id, jti, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [userId, jti]
  );
}
 
/**
 * Check that a reset token JTI is valid (exists + not expired).
 * Returns true if valid, false otherwise.
 */
async function validateResetToken(userId, jti) {
  const { rows } = await query(
    `SELECT id FROM password_reset_tokens
     WHERE user_id = $1 AND jti = $2 AND expires_at > NOW()`,
    [userId, jti]
  );
  return rows.length > 0;
}
 
/**
 * Mark a reset token as used by deleting it (single-use enforcement).
 */
async function consumeResetToken(userId, jti) {
  await query(
    "DELETE FROM password_reset_tokens WHERE user_id = $1 AND jti = $2",
    [userId, jti]
  );
}
 
/**
 * Clean up expired tokens — call this periodically (e.g. daily cron job).
 */
async function cleanExpiredResetTokens() {
  const { rowCount } = await query(
    "DELETE FROM password_reset_tokens WHERE expires_at < NOW()"
  );
  return rowCount;
}

async function reviewSubmission(id, { status, adminNote, reviewedBy }) {
  // status must be 'approved' or 'denied'
  const { rows } = await query(
    `UPDATE report_submissions
     SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, adminNote || "", reviewedBy, id]
  );
  return rows[0] || null;
}

module.exports = {
  pool,
  query,
  // Reports
  getAllReports,
  getReportById,
  createReport,
  updateReportStatus,
  // Feed
  getFeed,
  upsertFeedItem,
  deleteFeedItem,
  // Stats
  computeStats,
  setCommunityMembers,
  // Users
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  // Contact
  getAllContactSubmissions,
  createContactSubmission,
  // Report submissions
  getSubmissionsByReport,
  getAllPendingSubmissions,
  getAllSubmissions,
  createSubmission,
  reviewSubmission,
  storeResetToken,
  validateResetToken,
  consumeResetToken,
  cleanExpiredResetTokens,
};