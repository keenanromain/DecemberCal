# 🗓️ DecemberCal – Event-Driven Calendar 📅

This project is a fully containerized CQRS + SSE architecture built with Postgres, Go, TypeScript, React, and NGINX. It is an event-driven calendar system that allows users to create, edit, move (drag-drop), and delete events through a clean React UI. The project demonstrates its microservice design using:

1. **Postgres** – canonical write model w/ a dedicated read replica
2. **Write-Service (TypeScript)** – Express & Prisma ORM
3. **Read-Service (Go)** – fast read API w/ Server-Sent Events (SSE)
4. **Frontend** – React, Vite, & Chakra UI served by NGINX

The architecture uses CQRS, database triggers, SSE, `/healthcheckz` endpoints for container orchestration, NGINX for future hosting in a containerized cloud environment, and Docker-based isolation to create a decoupled system with real-time updates. Each service is orchestrated through a single `docker-compose.yml` file found in the root of this respository.

A bird's-eye view of the project's data flow:
```
frontend -> write-service -> events table -> events_read table -> read-service -> SSE -> frontend
```

To start the environment from scratch, use the helper script:
```
./docker_refresh.sh
```

Once the stack is running, the application can be accessed on the browser at:
```
http://localhost:8080/
```

**Note**: All containers are configured for ARM64 architecture to ensure consistent builds on my Apple Silicon machine, with future plans to support multi-architecture builds.

---
## Table of Contents
1. <a href="#architecture-overview">Architecture Overview</a>

2. <a href="#data-flow">Data Flow</a>

3. <a href="#postgres">Postgres</a>

4. <a href="#write-service-typescript">Write-Service (TypeScript)</a>

5. <a href="#read-service-go">Read-Service (Go)</a>

6. <a href="#frontend">Frontend</a>

7. <a href="#usage">Usage</a>

8. <a href="#requirements">Requirements</a>

9. <a href="#testing">Testing</a>

10. <a href="#out-of-scope">Out of Scope</a>

---
## Architecture Overview

DecemberCal follows a **CQRS (Command Query Responsibility Segregation)** pattern:

- Postgres
    - Stores the canonical event data
    - Uses a trigger function to mirror writes into a read-optimized replica
- Write-Service (TypeScript/Express)
    - Handles all event creation, updates, and deletes
    - Writes to the canonical events table
    - Runs Prisma migrations on startup
- Read-Service (Go)
    - Serves `GET /events` and `GET /events/:id`
    - Streams real-time updates via `GET /events/stream` using SSE
    - Reads only from events_read, the read replica
- Frontend (React + Vite + Chakra UI)
    - Displays the December 2025 calendar
    - Supports drag-and-drop event movement
    - Sends writes to the Write-Service
    - Subscribes to SSE to reflect updates immediately
    - Served by NGINX for fast static asset delivery

### Why CQRS?

1. Write paths remain simple and isolated

2. Read paths become extremely fast due to single optimized table

3. Cleaner separation of concerns 

4. Services scale independently

5. Higher throughput under application load

### Service-to-port mapping

| Service       | Port |
| ------------- | ---- |
| Postgres      | 5432 |
| Write-Service | 4000 |
| Read-Service  | 4001 |
| Frontend      | 8080 |

---
## Data Flow
```
frontend
   |
    -> write-service (POST/PUT/DELETE)
      |
       -> postgres.events
         |
          -> TRIGGER sync_events_to_read()
            |
             -> postgres.events_read
               |
                -> read-service (SSE/GET)
                   |
                    -> frontend real-time UI

```
### Real-Time Sync Breakdown
1. Write-Service performs INSERT/UPDATE/DELETE

2. Postgres trigger updates `events_read`

3. Trigger sends `pg_notify('events_changed', <payload>)`

4. Go Read-Service listens using `LISTEN events_changed`

5. Read-Service pushes SSE `event: update` to the browser

6. Frontend fetches latest event data using event ID passed in SSE pipeline

7. UI updates instantly without polling

---
## Postgres

### Overview

The Postgres container hosts two tables:

1. `events` (canonical write model)

This table stores the authoritative source of truth for event data.

2. `events_read` (read replica)

Maintained by a Postgres trigger that mirrors all inserts/updates/deletes.

### Schema

Both tables share the same structure. Below is the schema for the primary `events` table:
<img width="1065" height="395" alt="Image" src="https://github.com/user-attachments/assets/8fd4a93d-13e1-45b5-939e-857e6ed4eb56" />

The heart of this project is this trigger:

```
Triggers:
    sync_events_read AFTER INSERT OR DELETE OR UPDATE ON events FOR EACH ROW EXECUTE FUNCTION sync_events_to_read()
```
It ensures:

- updates propagate into the `events_read` table
- SSE notifications are fired via pg_notify
- eventual consistency with strong write guarantees

### Docker Configuration

The database runs via Docker Compose:

```yaml
postgres:
    image: postgres:15
    platform: linux/arm64
    environment:
      POSTGRES_USER: decembercal
      POSTGRES_PASSWORD: decembercal
      POSTGRES_DB: decembercal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U decembercal -d decembercal"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 5s
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres-data:
```

Docker Compose confirms DB readiness via its `healtcheck`. The other services only boot once the DB is accepting connections and data persists via the named Docker volume.

---
## Write-Service (TypeScript)

The **write-service** is the Command side of the CQRS architecture. It is responsible for creating events, updating events, and deleting events. It acts as the authoritative write-path for the system by validating user input using Zod and persisting data into the `events` table using Prisma ORM. The service runs Prisma migrations on startup.


### Overview

The write-service runs as compiled JavaScript in `dist/`. TypeScript is compiled into JavaScript only once to avoid the need for TypeScript dependencies at runtime. It waits for the postgres container to become healthy before booting and it exposes the internal server on 4000, making the read API available at `http://localhost:4000`.

### Tech Stack

- Express (HTTP server)

- Prisma ORM

- Zod (schema validation)

- Multi-stage Docker builds


### Endpoints

Express serves as the HTTP server layer for the write-service:

| Method | Route            | Description                         |
|--------|------------------|-------------------------------------|
| POST   | `/events`        | Create a new event                  |
| PUT    | `/events/:id`    | Update an existing event            |
| DELETE | `/events/:id`    | Delete an event                     |
| GET    | `/healthz`       | Health check                        |

Because of strict method enforcement, **all** routes except `/healthz` reject GET requests.

### Validation

Payloads are validated using Zod:

- All fields validated
- start + end must be valid ISO strings w/ end > start
- Must have **either** location **or** online_link
- Optional notes and numeric fields

This ensures that all malformed requests are rejected early.

### Database Migrations

On container startup (`entrypoint.sh`):

```
npx prisma migrate deploy
```

This guarantees that our database schema is always in-sync.

### Health Check

`GET /healthz`

Returns the following when healthy

`{ "status": "ok", "service": "write-service" }`

---

## Read-Service (Go) 

The **read-service** is the Query side of the CQRS architecture. It is highly optimized for fast, read-heavy workloads. It does this by reading from `events_read`, serving `GET /events` and `GET /events{id}` fast, streaming updates via SSE, and listening to the Postgres notify channel.

### Overview

The read-service is read-only by design. It uses pgxpool for efficient DB pooling and a Distroless runtime base image for increased security. Because its responsible for SSE, it uses a buffered channel for message handling and sends a heartbeat down the SSE pipeline every 15 seconds prevents dropped connections. The read-service waits for the postgres container to become healthy before booting and it exposes the internal server on 4001, making the read API available at `http://localhost:4001`.

### Tech Stack
- Go primitives (goroutines and channels) to listen for database changes

- SSE to push eventID on DB notify

- Pooled db connections

###  Endpoints

| Method | Route            | Purpose              |
| ------ | ---------------- | -------------------- |
| GET    | `/events`        | List all events      |
| GET    | `/events/{id}`   | Fetch specific event |
| GET    | `/events/stream` | SSE stream           |
| GET    | `/healthz`       | Health check         |


### Cross-Origin Resource Sharing (CORS) Configuration

```yaml
Origin: *
Methods: GET, OPTIONS
Headers: Content-Type
```

The service remains secure because the service is read-only.

### Health Check
`GET /healthz`

Returns the following when healthy

`{ "status": "ok", "service": "read-service" }`

---

## Frontend

The **frontend** service renders a December-based calendar UI, allows CRUD operations, and supports drag-and-drop movement of events between dates.


### Overview

The service is a single-page application that renders the December 2025 month grid, displays events, and opens modals on click. Each day of the month represents a unified modal for creating, editing, and deleting events. It also enforces strict frontend-side validation on submission. Despite this, it also has working drag-and-drop capabilities. This relies on PUT requests on the backend retaining all fields except the modified date. The frontend service depends on the `read-service` and `write-service` containers and can be reached in the browser at http://localhost:8080/.

### Tech Stack

- React (renders the UI)

- Vite (bundling and local development)

- Chakra UI (component library for layout, themes, responsive design)

- Axios (fetch-style API clients via `src/api/events.js`)

- Nginx (serves the build output / static assets)

- SSE

### Components

- **`Calendar.jsx`**
  - Renders the month grid for December 2025.
  - Groups events by date and shows badges within each day cell.
  - Clicking a day opens an **event creation modal**.
  - Clicking an event badge opens an **event editing modal**.
  - Includes support for drag-and-drop event movement.
  - Establishes SSE downstream connection for live updates.

- **`EventModal.jsx`**
  - Handles *create* , *edit*, and *delete* flows.
  - Validates required fields before submitting.
  - Talks to the write API (via `POST/PUT/DELETE /events`).

- **`api/events.js`**
  - Centralizes API configuration and endpoints for both read and write services.
  - Uses separate base URLs for:
    - **Read service** (e.g. `GET /events`, `GET /events/:id`, SSE `/events/stream`)
    - **Write service** (e.g. `POST/PUT/DELETE /events`)

### NGINX Runtime
The frontend is served using Nginx for caching and SPA routing through `try_files` and an index.html backup:

```conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Allow SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Good caching defaults for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        try_files $uri =404;
        expires 30d;
        access_log off;
    }
}
```

The frontend therefore can rely on a small and clean final image because of the two stage process:

1. **Builder Stage**: Vite compiles the React app

2. **Runtime Stage**: Nginx serves optimized static files

---
## Usage

It is recommended to use the helper script:
```
./docker_refresh.sh
```

The script is a full-lifecycle environment reset and bootstrap tool. It ensures a stable and reproducible local environment every time you run it. If Docker is turned off, the refresh script turns it on. 

The bash script wraps around the following core commands:

1. Cleans all containers, volumes, networks

```
docker compose down -v --remove-orphans
docker system prune -f
```

2. Rebuilds everything from scratch

```
docker compose up -d --build
```

3. Waits for ports to become available

    - Postgres:5432
    
    - write-service:4000

    - read-service:4001

    - frontend:8080

4. Waits for backend `/healthz` endpoints to succeed

5. Validates SSE readiness

```
curl -sfN http://localhost:4001/events/stream
```

6. Provides the elapsed runtime for startup

---

## Requirements

### To develop, run, or test the application locally, you will need the following tools installed:

1. Docker Desktop (Required)

The entire stack runs in Docker containers.

You must have:
 - Docker Engine 24+
 - Docker Compose v2+ (bundled with Docker Desktop)

Download:
https://www.docker.com/products/docker-desktop/

Verify your install:

```
docker --version
docker compose version
```

2. curl (Required for Test Suite)

All service tests in the test suite use `curl` to hit API endpoints. The `curl` command is installed by default for macOS.

Install for linux:

```
sudo apt install curl

curl --version
```

3. jq (Required for Test Suite)

The test suite uses `jq` to parse JSON responses.

Install:

```
brew install jq       # macOS
sudo apt install jq   # Ubuntu/Debian

jq --version
```

4. Node.js (Optional. This is only required for local frontend development)

If you want to run the frontend outside of Docker:
- Node.js v20+
- npm v10+

Download:
https://nodejs.org/en/download 

Verify your install:

```
node -v
npm -v
```

---

## Testing

DecemberCal has a Bash-based test suite. The tests are lightweight so they can be executed in any environment without requiring Node, Jest, or other test runners. They provide coverage for:

- Write-service behavior

- Read-service behavior

- Method-blocking enforcement

- Payload validation (Zod-enforced rules)

- SSE stability (`/events/stream`)

### Test execution

All tests live inside of the `./tests` directory. You can run all of the tests via one script at the root directory level by doing the following:

```
./tests/run_all_tests.sh
```


---

## Out of Scope
This project is designed to showcase a simple event-driven microservice architecture. To keep the project organized and focused, the following are intentionally left out:

1. Search functionality for events (i.e. `GET /search?q={searchQuery}`)
2. Authentication & Authorization (i.e. login required for `POST`, `PUT`, and `DELETE`)
3. Hosting in AWS (services likely required: ECR, ECS, RDS, ALB / API Gateway, SSM Parameter Store, CloudWatch, VPC, and Route 53)
```
        -------------------
        | Client frontend |
        ---------v--------- 
                 |
          -------+-------
          | API Gateway |
          -------+------- 
                 |
        ---------+---------
        |                 |
--------v--------   ------^-------- 
| ECS TypeScript|   | ECS Go      |
| write-service |   | read-service|
--------v--------   ------^--------           
        |                 |
        ---------+---------
                 |
        ---------^---------
        |   RDS Postgres  |
        ------------------- 
```
4. Multi-calendar support for every month in 2026
5. CI/CD (GitHub Actions)
6. Infrastructure as Code (Terraform or CloudFormation if in AWS)
7. Monitoring & Observability (Prometheus & Grafana)
8. More complex orchestrators (Kubernetes)
9. Support flags for the helper script (i.e. `--verbose` to print all Docker output, `--no-prune` to keep old images, `--skip-build` to skip the docker compose build step, etc.)
10. More robust test suite: end-to-end, performance benchmarking, load testing, unit testing, cross-browser, etc.
