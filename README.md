Overview

This project is a microservice-oriented application composed of four independently containerized services, all orchestrated through a single docker-compose.yml file. The architecture cleanly separates concerns between data storage, data access, data mutation, and user interaction, making it easy to reason about, extend, and deploy.

At a high level, the system includes:

Postgres – the central relational database for persistent storage

write-service – the backend service responsible for handling all data creation, updates, and business logic related to writes

read-service – the backend service that exposes optimized, read-only endpoints for fetching application data

frontend – a lightweight UI that interacts with the read/write services over HTTP

To start the environment from scratch, use the helper script:

```
./docker_refresh.sh
```
Once the stack is running, the application can be accessed locally at:
```
http://localhost:8080/
```

## Table of Contents
1. <a href="#postgres">PostgreSQL</a>

2. <a href="#read-service-go">Read-Service (Go)</a>

3. <a href="#write-service-typescript">Write-Service (TypeScript)</a>

4. <a href="#frontend">Frontend</a>

## PostgreSQL

### Overview

The database architecture follows a Command Query Responsibility Segregation (CQRS) pattern where:

- **write-service** (TypeScript) performs all `INSERT`, `UPDATE`, and `DELETE` operations.
- **read-service** (Go) reads data and exposes a high-performance, read-optimized API.

This separation ensures:
- Higher throughput under load  
- Cleaner separation of concerns  
- A more scalable and predictable architecture

### Schema

The primary table is:

### `Event`
| Column             | Type      | Notes                                      |
|--------------------|-----------|--------------------------------------------|
| `id`               | UUID      | Primary key                                |
| `name`             | TEXT      | Required                                   |
| `description`      | TEXT      | Optional                                   |
| `start`            | TIMESTAMP | Required, ISO 8601                         |
| `end`              | TIMESTAMP | Required                                   |
| `location`         | TEXT      | Optional                                   |
| `online_link`      | TEXT      | Optional                                   |
| `min_attendees`    | INT       | Optional                                   |
| `max_attendees`    | INT       | Optional                                   |
| `location_notes`   | TEXT      | Optional                                   |
| `preparation_notes`| TEXT      | Optional                                   |
| `created_at`       | TIMESTAMP | Auto-generated                             |
| `updated_at`       | TIMESTAMP | Auto-updated                               |

---

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
    ...
    ...
    ...
    ...
volumes:
  postgres-data:
```

Docker Compose confirms DB readiness via the healtcheck above. The other services only boot once the DB is accepting connections.

The Postgres service manages two primary tables:

`events` – The system’s authoritative write model.
All create/update/delete operations are performed against this table by the write-service. It stores the canonical event objects created by the application.

`events_read` – A read-optimized replica of the events table.
This table is connected to the read-service and is structured to support fast, query-heavy operations. This is would help to scale reads independently from writes if need be.


---

## Read-Service (Go) 

The **read-service** is the **Query** side of the CQRS architecture.  
It is highly optimized for fast, read-heavy workloads and powers the frontend calendar.

---

## 🚀 Purpose

This service:

- Exposes **GET /events** and **GET /events/{id}**
- Streams live updates using **Server-Sent Events (SSE)**
- Never mutates data — read-only by design
- Offers fast JSON responses backed by PostgreSQL


---

## 📡 Endpoints

### **GET /events**
Returns the full list of events.

### **GET /events/{id}**
Returns a single event by UUID.

### **GET /events/stream**
Continuous SSE stream that emits:

```json
{ "type": "refresh" }
```

The frontend listens for these events and reloads data instantly after any event creation, update, or deletion.

🔧 Architecture Highlights
1. Go + Gorilla Mux

Go provides low-latency JSON APIs, suitable for high-throughput read operations.

2. SSE Hub (broadcast model)

A custom hub handles all live connections:

Auto-reconnect

Safe concurrent writes via channels

No polling or WebSocket overhead

3. Database access

Connections are pooled and reused for efficiency.

CORS Configuration:
````
Origin: *
Methods: GET, OPTIONS
Headers: Content-Type
```
The service remains secure because the API surface is read-only.

🧪 Health Check
```
GET /healthz
```
returns
```
{ "status": "ok", "service": "read-service" }
```

Key Technical Merits

Perfect fit for CQRS: Zero write logic → simpler, faster reads

High-performance SSE: Instant UI updates

Isolated scalability: Read-side can scale independently with replicas

Robust concurrency: Idiomatic Go channel patterns

## Write-Service (TypeScript / Express)

The **write-service** is the Command side of the CQRS architecture.  
It is responsible for all **mutations**, including:

- Creating events  
- Updating events  
- Deleting events  

---

## 🚀 Responsibilities

### **Endpoints**
| Method | Route            | Description                         |
|--------|------------------|-------------------------------------|
| POST   | `/events`        | Create a new event                  |
| PUT    | `/events/:id`    | Update an existing event            |
| DELETE | `/events/:id`    | Delete an event                     |
| GET    | `/healthz`       | Health check                        |

### **Strict Method Enforcement**
All routes except `/healthz` reject GET requests


This enforces **Command-only behavior**.

---

## 🧰 Technology Stack

- **Node.js + Express**
- **Prisma ORM**
- **Zod validation schema**
- **PostgreSQL**
- **Dockerized environment**
- Runs as compiled JS (`dist/`) in production

---

## 🔒 Validation (Zod)

Payloads are validated using a strict schema:

- Required: name, start, end
- Must have **either** location **or** online_link
- Valid ISO date strings
- Optional notes and numeric fields
- End time must be after start

This ensures **all malformed requests are rejected early**.

🧪 Health Check
GET /healthz → { "status": "ok", "service": "write-service" }
Key Technical Merits

Clear separation of concerns

Strong schema validation via Zod

Prisma’s type-safe database access

Zero downtime rebuild via Docker

Direct integration with read-service SSE

Consistent error handling across endpoints

The write-service ensures that every write is safe, validated, and broadcasted.

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