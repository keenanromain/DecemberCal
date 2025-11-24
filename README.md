# 🗓️ DecemberCal 📅

This project is an event-driven calendar application that lets users create, view, update, and delete events that they schedule through a simple web interface.

The project was developed using a microservice architecture composed of four independently containerized services:

1. **Postgres** – the central relational database for persistent storage
2. **Read-Service (Go)** – the backend service responsible for data reads
3. **Write-Service (TypeScript)** – the backend service responsible for data writes, updates, and deletes
4. **Frontend** – a lightweight UI that interacts with the read/write services

Each service is orchestrated through a single `docker-compose.yml` file found in the root of this respository.

At a high level, the system also includes Read Replication, Server Send Events (SSE), Database Migrations, `/healthcheckz` endpoints for container orchestration, and NGINX for future hosting in a containerized cloud environment.

The project's data flow:

```
frontend → write-service → events table → events_read table → read-service → SSE → frontend
```

To start the environment from scratch, use the helper script:
```
./docker_refresh.sh
```
Once the stack is running, the application can be accessed on the browser at:
```
http://localhost:8080/
```

**Note**: All containers ensure that Docker builds and runs for ARM64 architecture. This was done to provide consistent builds on my Apple Silicon machine.

---
## Table of Contents
1. <a href="#postgres">Postgres</a>

2. <a href="#read-service-go">Read-Service (Go)</a>

3. <a href="#write-service-typescript">Write-Service (TypeScript)</a>

4. <a href="#frontend">Frontend</a>

5. <a href="#usage">Usage</a>

6. <a href="#testing">Testing</a>

7. <a href="#out-of-scope">Out of Scope</a>

---
## Postgres

### Overview

The **postgres** architecture follows a *Command Query Responsibility Segregation (CQRS)* pattern where:

- **write-service** (TypeScript) performs all `INSERT`, `UPDATE`, and `DELETE` operations.
- **read-service** (Go) reads data and exposes a high-performance, read-optimized SSE stream.

Separating reads from writes was a design decision to ensure:
- Higher throughput under application load  
- Cleaner separation of concerns  
- A more scalable and predictable architecture

### Schema

The primary `events` table:
<img width="1065" height="395" alt="Image" src="https://github.com/user-attachments/assets/8fd4a93d-13e1-45b5-939e-857e6ed4eb56" />

The `events_read` is a read replica table that is updated via the `sync_events_to_read()` trigger as seen in the `events` schema above. The trigger guarantees eventual consistency between services. This approach prioritizes availability and partition tolerance from a CAP theorem perspective.

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

### Indexing

The existing `events_pkey` provides a fast lookup by UUID.

---

## Read-Service (Go) 

The **read-service** is the Query side of the CQRS architecture. It is highly optimized for fast, read-heavy workloads. It waits for the postgres container to become healthy before booting and it exposes the internal server on 4001, making the read API available at `http://localhost:4001`.

### Overview

This service:

- Exposes `GET /events` and `GET /events/{id}`
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

### Architecture

1. Express HTTP Layer

Provides a lightweight and flexible API.

2. Prisma ORM (Write Model)

The service can interact with Postgres in a type-safe, schema-driven way.

3. Database access

All writes are persisted into the canonical `events` table.

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

The **frontend** service renders a December-based calendar UI, displays events streamed from backend services, and provides interfaces for creating, editing, and deleting events all with real-time updates.


### Overview

The service is a single-page application that renders the December 2025 month grid, displays events, and opens modals on click. Each day of the month represents a unified modal for creating, editing, and deleting events. It depends on the `read-service` and `write-service` containers and can be reached in the browser at http://localhost:8080/.

### Endpoints

On page load, the frontend:
  - Performs a REST `GET` to `/events` on the **read-service**.
  - Establishes an **SSE connection** to `/events/stream`.

When a user creates/edits/deletes an event:
  - The frontend calls the **write-service** (REST `POST/PUT/DELETE` to `/events`).
  - The backend’s trigger (`sync_events_to_read`) keeps the read database in sync.
  - The read service emits a `{ "type": "refresh" }` event on the SSE stream.
  - The frontend listens for that SSE event and re-fetches `/events`, ensuring the UI is immediately up to date.

The frontend exposes port 80.

### Architecture

1. React

Renders the user interface and manages application state

2. Vite

For bundling and local development

3. Chakra UI

Component library for layout, themes, responsive design

4. Axios
Fetch-style API clients (via `src/api/events.js`)

5. Nginx

Serves the build output / static assets

5. SSE

Stream keeps the UI synchronized

### Components

- **`Calendar.jsx`**
  - Renders the month grid for December 2025.
  - Groups events by date and shows badges within each day cell.
  - Clicking a day opens an **event creation modal**.
  - Clicking an event badge opens an **event editing modal**.

- **`EventModal.jsx`**
  - Handles both *create* and *edit* flows.
  - Validates required fields before submitting.
  - Talks to the write API (`POST/PUT/DELETE /events`).

- **`api/events.js`**
  - Centralizes API configuration and endpoints for both read and write services.
  - Uses separate base URLs for:
    - **Read service** (e.g. `GET /events`, `GET /events/:id`, SSE `/events/stream`)
    - **Write service** (e.g. `POST/PUT/DELETE /events`)

### Build-Time Configuration

The frontend uses Vite’s `VITE_*` env variables, baked in build time. They live in `.env.production`:

```yaml
VITE_READ_API=http://localhost:4001
VITE_WRITE_API=http://localhost:4000
```

### Run-Time Configuration
The frontend is served using Nginx for long-term asset caching, SPA routing through `try_files`, and high-performance static file serving.

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

The `./docker_refresh` script is a full-lifecycle environment reset and bootstrap tool. It ensures a stable and reproducible local environment every time you run it. The bash code wraps around the following core commands:

1. Cleans all containers, volumes, networks
```bash
docker compose down -v --remove-orphans
docker system prune -f
```

2. Rebuilds everything from scratch
```bash
docker compose up -d --build
```

3. Waits for ports to become available

    - Postgres:5432
    
    - write-service:4000

    - read-service:4001

    - frontend:8080

4. Waits for backend `/healthz` endpoints to succeed

5. Validates SSE readiness
```bash
curl -sfN http://localhost:4001/events/stream
```

---

## Testing

This project includes a shell-based test suite. The tests are lightweight (pure Bash + curl + jq) so they can be executed in any environment without requiring Node, Jest, or other test runners. They provide coverage for:

- Write-service behavior

- Read-service behavior

- Method-blocking enforcement

- Payload validation (Zod-enforced rules)

- SSE stability (`/events/stream`)

### Test execution

You can run all of the tests from inside the project root:
```bash
./tests/run_all_tests.sh
```

All tests live in the `./tests` directory.

---
## Out of Scope
This project is designed to showcase a simple event-driven microservice architecture. To avoid unnecessary complexity and keep my work focused, the following items fall outside the intended functionality:

1. Search functionality for events (i.e. `GET /search?q={searchQuery}` on a database like ElasticSearch)
2. Authentication & Authorization (i.e. login required for `POST`, `PUT`, and `DELETE`)
3. Drag-and-drop functionality for existing events on the UI
4. Hosting in AWS (services likely required: ECR, ECS, RDS, ALB / API Gateway, SSM Parameter Store, CloudWatch, VPC, and Route 53)
```
        +-----------------+
        | Client frontend |
        +--------+--------+ 
                 |
          +-------------+
          | API Gateway |
          +------+------+ 
                 |
        +--------+--------+
        |                 |
 ECS TypeScript         ECS Go
 write-service          read-service
        |                 |
        +--------+--------+
                 |
            RDS Postgres
```
5. GitHub Actions for CI/CD into the cloud
6. Infrastructure as Code (Terraform or CloudFormation if in AWS)
7. Use more beefy base images for Docker
8. DB pre-populated with example events (i.e. Christmas, NYE, Hanukkah, Kwanzaa, etc.)
9. Monitoring & Observability (Prometheus + Grafana and ELK)
10. More robust test suite: end-to-end, performance benchmarking, load testing, unit testing, cross-browser, etc.