# DecemberCal 📅

This project is an event-driven calendar application that lets users create, view, update, and delete events that they schedule through a simple web interface.

The project was developed using a microservice architecture composed of four independently containerized services:

1. **Postgres** – the central relational database for persistent storage
2. **Read-Service (Go)** – the backend service responsible for data reads
3. **Write-Service (TypeScript)** – the backend service responsible for data writes, updates, and deletes
4. **Frontend** – a lightweight UI that interacts with the read/write services

Each service is orchestrated through a single `docker-compose.yml` file found in the root of the respository.

At a high level, the system also includes:

Postgres 
 - Read Replication

read-service 
 - Server Send Events (SSE)

write-service 
 - Database Migrations

frontend 
 - NGINX Configuration

Data flow looks like the following:

```
frontend → write-service → events table → events_read table → read-service → SSE → frontend
```

To start the environment from scratch, use the helper script:
```
./docker_refresh.sh
```
Once the stack is running, the application can be accessed locally at:
```
http://localhost:8080/
```

Note: All containers ensure that Docker builds and runs for ARM64 architecture to provide consistent builds on my Apple Silicon machine.
---
## Table of Contents
1. <a href="#postgres">Postgres</a>

2. <a href="#read-service-go">Read-Service (Go)</a>

3. <a href="#write-service-typescript">Write-Service (TypeScript)</a>

4. <a href="#frontend">Frontend</a>
---
## Postgres

### Overview

The database architecture follows a *Command Query Responsibility Segregation (CQRS)* pattern where:

- **write-service** (TypeScript) performs all `INSERT`, `UPDATE`, and `DELETE` operations.
- **read-service** (Go) reads data and exposes a high-performance, read-optimized SSE stream.

Separating reads from writes was a design decision to ensure:
- Higher throughput under application load  
- Cleaner separation of concerns  
- A more scalable and predictable architecture

### Schema

The primary `events` table:
<img width="1065" height="395" alt="Image" src="https://github.com/user-attachments/assets/8fd4a93d-13e1-45b5-939e-857e6ed4eb56" />

The `events_read` is a read replica table that is updated via triggers:
<img width="372" height="62" alt="Image" src="https://github.com/user-attachments/assets/8be66e39-d821-4c4d-8724-d9b6f9a428d1" />

as seen in `services/write-service-ts/prisma/migrations/20250102_events_read_replica/migration.sql`

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

Docker Compose confirms DB readiness via the `healtcheck` above. The other services only boot once the DB is accepting connections.

---

## Read-Service (Go) 

The **read-service** is the Query side of the CQRS architecture. It is highly optimized for fast, read-heavy workloads. It waits for the postgres container to become healthy before booting and it exposes the internal server on 4001, making the read API available at `http://localhost:4001`.

### Overview

This service:

- Exposes **GET /events** and **GET /events/{id}**
- Streams using **Server-Sent Events (SSE)** for instant UI updates
- Is read-only by design
- Can scale independently with replicas


###  Endpoints

#### `GET /events`

Returns the full list of events.

#### `GET /events/{id}`

Returns a single event by UUID.

#### `GET /events/stream`

Returns a continuous SSE stream that emits `{ "type": "refresh" }` and a periodic heartbeat.

### Architecture
1. Go + Gorilla Mux

Go provides low-latency JSON APIs that are useful for high-throughput read operations.

2. SSE Hub (broadcast model)

A custom hub that ensures safe concurrent writes via channels, auto-reconnects, and no polling.

3. Database access

Connections are pooled and reused for efficiency.

4. CORS Configuration

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
## Write-Service (TypeScript)

The **write-service** is the Command side of the CQRS architecture. It is responsible for creating events, updating events, and deleting events. It acts as the authoritative write-path for the system, persisting data into the events table using Prisma ORM.


### Overview

The service runs as compiled JavaScript in `dist/`. TypeScript is compiled into JavaScript only once to avoid the need for ts-node or TypeScript dependencies at runtime. It waits for the postgres container to become healthy before booting and it exposes the internal server on 4000, making the read API available at `http://localhost:4000`.


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

- Required: name, start, end
- Must have **either** location **or** online_link
- Valid ISO date strings
- Optional notes and numeric fields
- End time must be after start

This ensures that all malformed requests are rejected early.


### Database Migrations

Migrations occur during runtime with `services/write-service-tes/entrypoint.sh`. Any outstanding database migrations are triggered via `npx prisma migrate deploy`.

### Health Check

`GET /healthz`

Returns the following when healthy

`{ "status": "ok", "service": "write-service" }`

---
## Frontend
This frontend service is a modern, production-ready single-page application built with React, Vite, and Chakra UI, packaged for deployment via Docker and served in production by NGINX. The application renders a December-based calendar UI, displays events streamed from backend services, and provides interfaces for creating, editing, and deleting events with real-time updates.

The architecture emphasizes simplicity, performance, modularity, and cloud-deployability, making it suitable both for local development and for future hosting in a containerized cloud environment.

🚀 Technology Stack
Framework

React (with functional components & hooks)

Chakra UI (component library with theming & accessibility built-in)

Build Tooling

Vite

Lightning-fast development server

Modern ES module output

Optimized production builds

.env.production support for build-time API injection. The environment variables used for this project are:
```
VITE_READ_API=http://localhost:4001
VITE_WRITE_API=http://localhost:4000
```

Runtime

NGINX (static file server for production)

SPA-optimized configuration

Gzip compression

Asset caching and immutable cache rules

Clean routing via try_files

Containerization

Docker multi-stage build

Stage 1: Node 20 Alpine for Vite build

Stage 2: NGINX Alpine serving the /dist bundle

Smaller, secure, production-ready images

APIs

Read service (SSE stream + REST GET endpoints)

Write service (REST POST/PUT/DELETE endpoints)


Key Components

Calendar.jsx
Renders the December 2025 month grid, displays events, and opens modals on click.

EventModal.jsx
The unified modal for creating and editing events, with front-end validation that matches backend Zod schemas.

SSE Integration
A Server-Sent Events stream keeps the UI synchronized with backend event updates without polling.

Data Flow

Frontend loads → fetches events from read-service

User clicks a date or event → opens EventModal

Modal validates & submits payload → sent to write-service

write-service notifies read-service → emits SSE refresh

Frontend receives SSE update → reloads event list
(Achieves near real-time consistency)

Key Technical Merits
⭐ 1. Clean, Reactive UI with Modular Components

Calendar rendering is deterministic.

Event modal is unified across create/edit flows.

All components share consistent styles via Chakra UI.

⭐ 2. Strong Validation

The modal enforces:

Required: name, description, and one of location | online_link

Proper date/time consistency: end > start

Numeric sanity checks (e.g., attendees)

This matches backend Zod validation for consistent shared rules.

⭐ 3. Real-Time Updates via SSE

State synchronization is fast and efficient.

No polling required.

Browser-native EventSource keeps implementation simple.

⭐ 4. Cloud-Friendly Containerization

NGINX serves compiled static assets.

Node.js is not shipped in production.

Multi-stage builds keep image <50MB.

Healthchecks ensure correct orchestration behavior.

⭐ 5. Fully Declarative Configuration

.env.production enables clean separation of runtime vs build-time settings.

Vite only bundles necessary API URLs.

Docker and NGINX configs are minimal, clear, and reproducible.

Healthcheck Behavior

The frontend container uses a curl -sf http://localhost/ healthcheck, confirming:

NGINX is serving static files

The container is operational

The SPA fallback routing works