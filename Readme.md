# ReportASA — Backend

Node.js + Express backend that stores incident reports and feed data as JSON files.

Front end: npm start
Back end: npm run dev

---

## Setup

```bash
cd reportasa-backend
npm install
npm run dev      # dev (auto-restart on save)
npm start        # production
```

Server starts on **http://localhost:3001** by default.  
Set `PORT=xxxx` as an env variable to change it.

---

## File Structure

```
reportasa-backend/
├── server.js           # entry point
├── db.js               # JSON file helpers
├── package.json
├── routes/
│   ├── reports.js      # /api/reports
│   ├── stats.js        # /api/stats
│   └── feed.js         # /api/feed
└── data/               # auto-created on first run
    ├── reports.json    # all submitted reports
    ├── feed.json       # homepage recent-reports widget
    └── stats_overrides.json
```

---

## API Reference

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |

---

### Reports — `/api/reports`

#### Submit a report
`POST /api/reports`

**Body (JSON):**
```json
{
  "type":        "Online Harassment",
  "date":        "2025-03-15",
  "location":    "Brooklyn, New York",
  "org":         "Some Organization",
  "description": "Detailed description of the incident...",
  "contact":     "user@example.com",
  "anonymous":   true,
  "links": [
    "https://example.com/screenshot1",
    "https://twitter.com/post/123"
  ]
}
```

**Response `201`:**
```json
{
  "success": true,
  "report": {
    "id": "report-1710000000000-abc12",
    "status": "Under Review",
    "createdAt": "2025-03-15T10:00:00.000Z",
    ...
  }
}
```

> `status` is **always set to `"Under Review"`** on creation regardless of what is sent.

---

#### List all reports (admin)
`GET /api/reports`

---

#### Get single report (admin)
`GET /api/reports/:id`

---

#### Update report status (admin)
`PATCH /api/reports/:id/status`

**Body:**
```json
{ "status": "Resolved" }
```

Valid statuses: `Under Review` · `In Progress` · `Resolved` · `Dismissed`

---

#### Recent reports (used by front-end homepage)
`GET /api/reports/recent`

Returns the 10 most recently submitted reports formatted as feed items.

---

### Stats — `/api/stats`

#### Get stats
`GET /api/stats`

Returns live-computed stats from reports.json:
```json
{
  "reports_submitted":  42,
  "cases_resolved_pct": 71,
  "states_covered":     12,
  "community_members":  0
}
```

#### Set community members count manually
`POST /api/stats/community`
```json
{ "count": 12000 }
```

---

### Feed — `/api/feed`

The feed is the "Recent Reports" widget on the homepage. It is **separate** from the reports database so you can manually curate what's shown (e.g. feature high-profile cases).

#### Get feed
`GET /api/feed`

#### Add / update feed item
`POST /api/feed`
```json
{
  "id":       "feed-1",
  "location": "New York, NY",
  "type":     "Online Harassment",
  "time":     "2 hours ago",
  "status":   "Under Review"
}
```
- If `id` already exists → updates it
- If `id` is omitted → creates a new item with an auto-generated id
- New items are prepended to the top; feed is capped at 20 items

#### Update a feed item
`PATCH /api/feed/:id`
```json
{ "status": "Resolved" }
```

#### Delete a feed item
`DELETE /api/feed/:id`

---

## Connecting the Front-End

In your React `App.js`, change:
```js
const API_BASE = "http://localhost:3001";
```

---

## Example: curl commands

```bash
# Submit a report
curl -X POST http://localhost:3001/api/reports \
  -H "Content-Type: application/json" \
  -d '{"type":"Workplace","location":"Chicago, IL","description":"Test incident"}'

# Update report status
curl -X PATCH http://localhost:3001/api/reports/report-123/status \
  -H "Content-Type: application/json" \
  -d '{"status":"Resolved"}'

# Update a feed item status
curl -X PATCH http://localhost:3001/api/feed/feed-1 \
  -H "Content-Type: application/json" \
  -d '{"status":"Resolved"}'

# Add a new feed item
curl -X POST http://localhost:3001/api/feed \
  -H "Content-Type: application/json" \
  -d '{"location":"Miami, FL","type":"Community","time":"30 minutes ago","status":"Under Review"}'

# Get live stats
curl http://localhost:3001/api/stats
```