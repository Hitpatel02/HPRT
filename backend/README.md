# HPRT — Backend

Backend service for the HPRT client document and reminder management system. Built with Node.js, Express, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | PostgreSQL (raw `pg` driver) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Job Queue | pg-boss (PostgreSQL-backed) |
| Real-time | Socket.io |
| Logging | Winston |
| Email | Microsoft Graph API (MSAL) |
| WhatsApp | whatsapp-web.js + Puppeteer |
| PDF Generation | Puppeteer (HTML → PDF) |
| Reports | pdfmake, json2csv |

---

## Folder Structure

```
backend/
├── controllers/        # HTTP handlers — req/res only, no business logic, no DB queries
├── services/           # Business logic — called by controllers, calls queries
├── queries/            # All database queries — raw SQL via pg driver
├── routes/             # Route definitions — map endpoints to controllers
├── middlewares/        # Express middleware — errorHandler, notFound
├── middleware/         # Auth middleware (authenticateToken)
├── config/             # DB connection (db.js), WhatsApp singleton (whatsappClient.js)
├── utils/              # Pure helper functions — dateUtils, logger, requestUtils, whatsappUtils
├── jobs/               # pg-boss job definitions and scheduler
├── workers/            # Reminder worker process (separate from API server)
├── templates/          # HTML templates for PDF generation
├── sockets/            # Socket.io handlers (WhatsApp real-time events)
└── server.js           # App entry point (http.Server + Socket.io)
```

### Architecture Rules

| Layer | Responsibility | Can call |
|---|---|---|
| **routes/** | Define URL endpoints | controllers |
| **controllers/** | Handle req/res, validate inputs, send responses | services, queries |
| **services/** | Business logic, orchestration | queries, utils |
| **queries/** | Database access only | config/db |
| **middlewares/** | Cross-cutting concerns | utils/logger |
| **utils/** | Pure, stateless helper functions | nothing |

**Cross-layer violations are prohibited:**
- No SQL in controllers or routes
- No DB imports in controllers or routes
- No business logic in routes
- No HTTP objects (req/res) in services or queries

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=8080
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname
# OR use individual vars:
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=HPFP
PGHOST=localhost
PGPORT=5432

# Auth
JWT_SECRET=your_jwt_secret_here

# Microsoft Graph (Email)
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=

# Application
SENDER_EMAIL=
LOG_LEVEL=info
# WhatsApp (optional — specify only if using system Chrome on VPS)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start development server (with auto-reload)
npm run dev

# 4. Start production server
npm start
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/verify` | Verify current token |
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create client |
| PATCH | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |
| POST | `/api/clients/:id/send-reminder` | Send WhatsApp reminder to client |
| GET | `/api/documents` | All document records |
| GET | `/api/documents/month/:month` | Documents by month |
| PATCH | `/api/documents/:id` | Update document record |
| POST | `/api/documents/create-for-all` | Create docs for all clients |
| GET | `/api/pending-documents` | Pending document records |
| GET | `/api/settings` | Get reminder settings |
| POST | `/api/settings` | Create settings |
| PATCH | `/api/settings/:id` | Update settings |
| GET | `/api/reminders` | Get reminder dates |
| POST | `/api/reminders/trigger/:type` | Manually trigger reminder |
| GET | `/api/groups` | List groups |
| PATCH | `/api/groups/:id` | Update group |
| POST | `/api/groups/reset` | Reset all groups |
| GET | `/api/whatsapp/status` | WhatsApp connection status |
| POST | `/api/whatsapp/connect` | Initialize WA client (emits QR via socket) |
| POST | `/api/whatsapp/disconnect` | Disconnect WA (keep session) |
| DELETE | `/api/whatsapp/session` | Delete WA session files |
| POST | `/api/agreements/generate` | Generate agreement PDF (returns `application/pdf`) |
| GET | `/api/reports/data` | Report data |
| GET | `/api/reports/download-csv` | Download CSV report |
| GET | `/api/logs/whatsapp` | WhatsApp logs |
| GET | `/api/logs/email` | Email logs |
| GET | `/health` | Health check |

---

## Error Handling

All errors are handled centrally via `middlewares/errorHandler.js`. Controllers delegate unexpected errors using `next(error)`. Validation errors are returned directly with `res.status(4xx)`.

**Standard API response format:**
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

**Standard error format:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Logging

Winston logger at `utils/logger.js`. Writes to:
- **Console** — coloured output during development
- **logs/combined.log** — all levels
- **logs/error.log** — errors only
- **logs/whatsapp.log** — WhatsApp debug logs

Log level is controlled by the `LOG_LEVEL` environment variable (default: `info`).

---

## Development Workflow

```bash
# Start with auto-reload
npm run dev

# Check for issues (no test suite yet)
node -e "require('./server')" && echo "Server loads cleanly"
```

The frontend (`../frontend/dist/`) is served as a static SPA from the backend in production. During development, run the Vite dev server separately from `frontend/`.

---

## Phase 4 — Client Agreement PDF Generator

### Feature Overview

Generates professional A4 client service agreements as PDFs, rendered from an HTML template using Puppeteer.

| UI Page | `/agreements` |
|---|---|
| API Endpoint | `POST /api/agreements/generate` |
| Template | `backend/templates/agreementTemplate.html` |
| Service | `backend/services/agreementService.js` |

**Form fields:**
- Client Name, PAN Number, Fee Percentage (%), Party/Firm Name, Client Address, Agreement Date

**Flow:** Fill form → Generate → PDF previewed inline in browser iframe → Download button enabled → Click to download as `Agreement_<ClientName>.pdf`

---

### Puppeteer Dependency

Puppeteer is **already installed** as part of `whatsapp-web.js` and is listed in `dependencies`. No extra install needed.

```bash
# Puppeteer version in use:
npm ls puppeteer
# Expected: puppeteer@22.x.x
```

Puppeteer **downloads Chromium** during install. On most systems this works automatically. On VPS headless servers, you may need system Chrome instead.

---

### Installing Chrome on VPS (Ubuntu/Debian)

If Puppeteer's bundled Chromium has issues on your VPS, install system Chrome:

```bash
# Add Google signing key
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

# Add Chrome repo
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
  | sudo tee /etc/apt/sources.list.d/google-chrome.list

# Install
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install additional system libs required by headless Chrome
sudo apt-get install -y \
  libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Verify
google-chrome --version
```

Then set the environment variable so Puppeteer uses system Chrome instead of bundled Chromium:

```env
# In .env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

---

### Running in Production

```bash
# PDF generation happens in the API server process — no separate worker needed
npm run pm2:start    # starts both API + reminder worker

# The API server handles POST /api/agreements/generate
# Puppeteer spawns a headless Chrome per request and exits cleanly
```

**Production notes:**
- Puppeteer spawns a NEW browser per PDF request and closes it in a `finally` block — no process leaks
- `--no-sandbox` flag is set for VPS compatibility
- `--disable-dev-shm-usage` prevents memory issues in containers
- PDF generation typically takes 2–8 seconds (warm) or up to 30s on first run (Chromium init)
- No PDFs are stored on the server — returned as Buffer in HTTP response

---

### Environment Variables (Phase 4)

| Variable | Purpose | Required |
|---|---|---|
| `PUPPETEER_EXECUTABLE_PATH` | Path to system Chrome binary (VPS only) | No (optional) |

If not set, Puppeteer uses its bundled Chromium (works on most development systems).