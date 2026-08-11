# Sentinel AI Production Deployment Documentation

Sentinel AI is structured as a robust multi-container microservice monorepo running on Docker Compose, fronted by an Nginx reverse proxy routing web requests and securing the infrastructure.

---

## 1. Production Architecture Overview

The production ecosystem consists of five inter-connected docker services communicating over a private internal virtual network:

```mermaid
graph TD
    Client[Web Client] -->|Port 80| Nginx[Nginx Reverse Proxy]
    Nginx -->|Proxy /| FE[Next.js Frontend]
    Nginx -->|Proxy /api| BE[NestJS Backend]
    BE -->|Store data| DB[(PostgreSQL Database)]
    BE -->|Broker tasks| Redis[(Redis Queue / BullMQ)]
```

- **Nginx**: Front-facing web server, handles SSL/TLS termination, Gzip response compression, security headers (OWASP compliance), and routing.
- **Frontend**: Next.js single-page UI running inside process isolated Docker container.
- **Backend**: NestJS REST API executing as non-root `node` user with Helmet security and Throttler rate limiting.
- **Database**: PostgreSQL persistent storage.
- **Queue Broker**: Redis powering the multi-queue BullMQ background engine.

---

## 2. Environment Variables Configuration

Create a `.env` configuration file in the root workspace directory before starting:

```ini
# --- General Environment Config ---
NODE_ENV=production
ALLOWED_ORIGINS=http://yourdomain.com,http://localhost

# --- Backend Application Config ---
PORT=3000
JWT_ACCESS_SECRET=your_jwt_access_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# --- PostgreSQL Connection Config ---
DATABASE_URL=postgresql://postgres:postgrespassword@postgres:5432/sentinel_db?schema=public
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=sentinel_db
POSTGRES_HOST=postgres

# --- Redis Configuration ---
REDIS_HOST=redis
REDIS_PORT=6379

# --- AI Logic & Google API Config ---
GEMINI_API_KEY=your_gemini_api_key_here
GMAIL_ACCESS_TOKEN=gmail_token_here
GMAIL_REFRESH_TOKEN=gmail_refresh_token_here
GOOGLE_CLIENT_ID=google_client_id
GOOGLE_CLIENT_SECRET=google_client_secret
```

---

## 3. Launching Production Infrastructure

Build and run all services in detached background mode:

```bash
# Compile and start containers
docker compose up -d --build
```

Verify service execution status:

```bash
# Check running containers
docker compose ps

# Inspect logs
docker compose logs -f
```

---

## 4. Security Hardening Checklists

### OWASP Best Practices
- **Strict Headers**: Nginx sets `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` on all transactions.
- **Helmet Middleware**: Configures HTTP headers in the backend API layer.
- **Rate Limiting**: Enforced globally at 100 requests per minute via Throttler.
- **Non-Root Processes**: All application processes inside the Docker runner stages execute under the isolated `node` user ID.

---

## 5. Automated Backups Configuration

The system includes a daily backup rotation script located in `scripts/backup.sh`. Configure a standard cron job on the host server to trigger daily at midnight:

```bash
# Open crontab configuration editor
crontab -e
```

Append the scheduling instruction:

```cron
0 0 * * * docker exec sentinel-backend /bin/sh /app/scripts/backup.sh >> /var/log/sentinel_backup.log 2>&1
```

This dumps the PostgreSQL database and copies SQLite/JSON data archives to `/app/data/backups/`, automatically keeping only the last 7 days of snapshots.

---

## 6. Uptime Diagnostics & Monitoring

- **API Health Check**: Query `/api/health` to get database status, Redis ping results, and server uptime.
- **BullMQ Metrics**: Retrieve active queue loads from `/api/queue/metrics`.
