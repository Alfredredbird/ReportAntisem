/**
 * db.js — lightweight JSON-file "database"
 *
 * File layout inside /data:
 *   reports.json   – array of report objects
 *   feed.json      – array of recent-feed items shown on the homepage
 */

const fs   = require("fs");
const path = require("path");

const DATA_DIR      = path.join(__dirname, "data");
const REPORTS_FILE  = path.join(DATA_DIR, "reports.json");
const FEED_FILE     = path.join(DATA_DIR, "feed.json");
const CONTACT_FILE  = path.join(DATA_DIR, "contact.json");
const USERS_FILE    = path.join(DATA_DIR, "users.json");

// ── Bootstrap ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function initFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

initFile(REPORTS_FILE, []);
initFile(CONTACT_FILE, []);
initFile(USERS_FILE, []);
initFile(FEED_FILE, [
  { id: "feed-1", location: "New York, NY",    type: "Online Harassment", time: "2 hours ago", status: "Under Review" },
  { id: "feed-2", location: "Los Angeles, CA", type: "Workplace",         time: "5 hours ago", status: "Resolved"     },
  { id: "feed-3", location: "Chicago, IL",     type: "Educational",       time: "1 day ago",   status: "In Progress"  },
  { id: "feed-4", location: "Houston, TX",     type: "Community",         time: "2 days ago",  status: "Resolved"     },
]);

// ── Generic helpers ───────────────────────────────────────────────────────────
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Reports ───────────────────────────────────────────────────────────────────
function getAllReports()         { return readJSON(REPORTS_FILE); }
function saveReports(reports)   { writeJSON(REPORTS_FILE, reports); }

function getReportById(id) {
  return getAllReports().find(r => r.id === id) || null;
}

function createReport(data) {
  const reports = getAllReports();
  const report  = {
    id:          `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status:      "Under Review",   // ← always starts here
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    type:        data.type        || "",
    date:        data.date        || "",
    location:    data.location    || "",
    org:         data.org         || "",
    description: data.description || "",
    contact:     data.contact     || "",
    anonymous:   data.anonymous   !== false,
    links:       Array.isArray(data.links) ? data.links.filter(Boolean) : [],
    source:      data.source      || "full_form",
  };
  reports.push(report);
  saveReports(reports);
  return report;
}

function updateReportStatus(id, status) {
  const reports = getAllReports();
  const idx     = reports.findIndex(r => r.id === id);
  if (idx === -1) return null;
  reports[idx].status    = status;
  reports[idx].updatedAt = new Date().toISOString();
  saveReports(reports);
  return reports[idx];
}

// ── Feed ──────────────────────────────────────────────────────────────────────
function getFeed()           { return readJSON(FEED_FILE); }
function saveFeed(items)     { writeJSON(FEED_FILE, items); }

function upsertFeedItem(item) {
  const feed = getFeed();
  const idx  = feed.findIndex(f => f.id === item.id);
  if (idx === -1) {
    feed.unshift(item);           // new items go to top
    if (feed.length > 20) feed.pop(); // cap at 20 entries
  } else {
    feed[idx] = { ...feed[idx], ...item };
  }
  saveFeed(feed);
  return getFeed();
}

function deleteFeedItem(id) {
  const feed = getFeed().filter(f => f.id !== id);
  saveFeed(feed);
  return feed;
}

// ── Stats (derived from reports + feed) ───────────────────────────────────────
function computeStats() {
  const reports  = getAllReports();
  const total    = reports.length;
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const states   = new Set(
    reports
      .map(r => (r.location || "").split(",").pop().trim())
      .filter(Boolean)
  ).size;

  return {
    reports_submitted:  total,
    cases_resolved_pct: total > 0 ? Math.round((resolved / total) * 100) : 0,
    states_covered:     states,
    community_members:  0,   // set manually or via a separate endpoint
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────
function getAllUsers()       { return readJSON(USERS_FILE); }
function saveUsers(users)   { writeJSON(USERS_FILE, users); }

function getUserById(id)    { return getAllUsers().find(u => u.id === id) || null; }
function getUserByEmail(email) {
  return getAllUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function createUser(data) {
  const users = getAllUsers();
  const user  = {
    id:           `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt:    new Date().toISOString(),
    lastLoginAt:  new Date().toISOString(),
    role:         data.role       || "user",
    email:        data.email      || "",
    passwordHash: data.passwordHash || "",
    name:         data.name       || "",
    title:        data.title      || "",
    department:   data.department || "",
    bio:          data.bio        || "",
    avatar:       data.avatar     || "",
  };
  users.push(user);
  saveUsers(users);
  return user;
}

function updateUser(id, updates) {
  const users = getAllUsers();
  const idx   = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates, id, updatedAt: new Date().toISOString() };
  saveUsers(users);
  return users[idx];
}

// ── Contact Submissions ───────────────────────────────────────────────────────
function getAllContactSubmissions() { return readJSON(CONTACT_FILE); }

function createContactSubmission(data) {
  const submissions = getAllContactSubmissions();
  const submission  = {
    id:        `contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    name:      data.name    || "",
    email:     data.email   || "",
    subject:   data.subject || "",
    message:   data.message || "",
  };
  submissions.push(submission);
  writeJSON(CONTACT_FILE, submissions);
  return submission;
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReportStatus,
  getFeed,
  upsertFeedItem,
  deleteFeedItem,
  computeStats,
  getAllContactSubmissions,
  createContactSubmission,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
};