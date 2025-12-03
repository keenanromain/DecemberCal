# Walkthrough

This document is designed to serve as a guided tour of how the entire application works, why each service exists, what relationships exist between them, and highlight how to productively interact with the application. By the end, you’ll have a clearer mental model on how the entire system works. Assuming you meet the [requirements as specified in the README](https://github.com/keenanromain/DecemberCal/tree/main?tab=readme-ov-file#requirements), you can git clone this repository onto your local machine and begin in the following way:

1. `./refresh_docker.sh`
   - This rebuilds every image.
   - Ensures Docker daemon is running.
   - Applies migrations inside write-service on boot.
  
2. `docker compose ps`
   - shows container status and health
   - shows health for postgres and frontend
3. `curl http://localhost:4001/healthz`
4. `curl http://localhost:4000/healthz`
5. 
```
docker compose exec postgres \
  psql -U decembercal -d decembercal \
  -c 'SELECT id, name, start, "end" FROM events ORDER BY id DESC;'
```
   - pre-seeded events for the month
   - highlight current date associated with events
6. open [localhost:8080/](http://localhost:8080/)
   - move hometown visit to tomorrow and run db query again showing the date change
   - create a new event called 'Wedding Planning':
        - leave out name showing the warning
        - leave out description showing the warning
        - leave out location and online_link showing the warning
7. `curl -v http://localhost:4001/events | grep Wedding`
   - 200 OK
   - CORs enabled: `Access-Control-Allow-Origin: *`
   - New event is highlighted in grep
8. `curl -v http://localhost:4000/events | grep Wedding`
   - 405 Method Not Allowed
   - write service is for writing, only read service can read
9. 
```
curl -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Holiday Shopping!",
        "description": "Do not forget wrapping paper",
        "location": "Manalapan",
        "start": "2025-12-11T12:00:00Z",
        "end": "2025-12-11T13:00:00Z",
        "min_attendees": 5,
        "max_attendees": 10
      }'
```
   - show result on web page
   - Open modal to see fields
10. 
```
docker compose exec postgres psql -U decembercal -d decembercal \
  -c "SELECT id, name FROM events_read ORDER BY created_at DESC;"
```
   - query from read replica showing the relevant information
   - re-run POST request from earlier to show idemopotency as a new "Holiday Shopping!" is created
   - re-run the db query to show a new "Holiday Shopping!" record exists in the db but now with a different ID

11. Go to web page and delete two events. Move remaining events onto the same day.

12. `curl -s http://localhost:4001/events | jq`
   - show read service reflects these changes
   - All have same start date in the JSON

13. Go to second terminal and run `curl -sfN http://localhost:4001/events/stream`
   - Leave this terminal open. It is the SSE stream.
   - Every time the write-service modifies data, the read-service emits an update.

14. In original terminal, run a POST command again:
```
curl -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{
        "name":"Xmas Eve",
        "description":"Twas the night before Christmas",
        "location":"Boston",
        "start":"2025-12-24T12:00:00Z",
        "end":"2025-12-24T13:00:00Z",
        "min_attendees":5,
        "max_attendees":10
      }'

```
   - You will see the event’s id from the db being passed down the SSE pipeline. If not, try another idempotent request.
   - In web UI, delete the event. That should show up in the SSE pipeline as well.
   - You will also see the periodic heartbeats to keep the connection alive and help detect disconnections

15. `./tests/run_all_tests.sh`
   - runs write, read, and integration tests
   - the creation and deletion of test events should appear in the SSE stream
   - break out of the SSE stream at this point
16. `EVENT_ID=$(curl -s http://localhost:4001/events | jq -r '.[0].id')`
17. `echo $EVENT_ID`
18. 
```
curl -X PUT http://localhost:4000/events/$EVENT_ID \
  -H "Content-Type: application/json" \
  -d "{
        \"name\": \"Updated Event Title\",
        \"description\": \"Updated description\",
        \"location\": \"Denver\",
        \"start\": \"2025-12-11T14:00:00Z\",
        \"end\": \"2025-12-11T15:00:00Z\",
        \"min_attendees\": 3,
        \"max_attendees\": 20
      }"

```
19. Open Chrome DevTools -> Network -> Filter by Fetch/XHR
   - Create an event called "Day Trip Skiing"
       - you should see a POST request where the event is created
       - you should see a GET request where the event was called
   - Move the event to a different day
       - you should see a PUT request
   - Delete the event
       - you should see a DELETE request
   
20. Files of interest:

### Utility & Support Files

   - `docker-compose.yml`
       - Orchestrates all four services (Postgres, read-service, write-service, frontend) into a unified local environment.
       - Exposes service ports (5432, 4000, 4001, 8080) so the microservices can communicate and be accessed from the host machine.
       - Ensures reproducible builds across local machines via deterministic container definitions.
   - `refresh_docker.sh`
        - Tears down containers, volumes, networks.
        - Rebuilds from scratch with docker compose up --build.
        - Waits for services to become healthy.
        - Validates endpoints (/healthz, SSE stream)
   - `tests/run_all_tests.sh`
        - End-to-end validation of write-service, read-service correctness, and method blocking.

### Frontend

   - `frontend/Dockerfile`
        - Multi-stage build: compiles the React app using Vite, then creates a minimal, production-grade NGINX image.
        - Ensures tiny final image size by copying only /dist artifacts.
        - Uses NGINX static serving, giving high-performance caching and SPA routing support.
   - `frontend/index.html`
        - Entry HTML template used by Vite to bootstrap the React app.
        - Defines the root <div id="root"></div> where React mounts the application.
        - Loads the Vite module script /src/main.jsx.
   - `frontend/src/main.jsx`
        - Acts as the true entry point for the React app 
        - Enables ChakraProvider for themes, components, and styling.
   - `frontend/src/App.jsx`
        - A top-level layout component that renders the Calendar inside a Chakra Container.
        - Provides consistent spacing and layout across screen sizes.
   - `frontend/src/api/events.js`
        - Centralizes all API calls for read/write services.
   - `frontend/src/components/Calendar.jsx`
        - The core calendar UI: renders the December 2025 grid, event grouping, and drag-and-drop movement.
        - Implements SSE subscription logic to keep the UI synced with backend changes in real time.
        - Contains the “clean payload builder” for PUT updates that preserve optional fields and validate business rules.
   - `frontend/src/components/EventModal.jsx`
        - Handles creation, editing, validation, and deletion of events.
        - Ensures the frontend enforces required fields (name, description, location OR online_link).
        - Central to write-service interaction—calls POST, PUT, DELETE.
   - `frontend/vite.config.js`
        - Makes containerized development easier by exposing the Vite dev server to Docker networking.
        - Enables React fast-refresh and dev server configuration (port 5173, host 0.0.0.0).

### Write-Service (TypeScript)

   - `services/write-service-ts/Dockerfile`
        - Multi-stage build that compiles TS → JS in a Node 20 Slim image, then runs the result in a clean runtime environment.
        - Includes OpenSSL and netcat for Prisma compatibility and DB readiness checks.
        - Produces deterministic ARM64 builds suitable for Apple Silicon and cloud clusters.
   - `services/write-service-ts/entrypoint.sh`
        - Waits for Postgres readiness before executing Prisma migrations.
        - Launches the write-service after migrations complete.
   - `services/write-service-ts/src/index.ts`
        - Express server entry point that exposes POST, PUT, DELETE for /events.
        - Enforces request-body validation using Zod before all writes.
        - Uses Prisma ORM for type-safe queries and schema-driven DB access.
   - `services/write-service-ts/src/validation.ts`
        - Zod schema containing validation and business rules.
        - Prevents malformed payloads from reaching the DB.
   - `services/write-service-ts/prisma/schema.prisma`
        - Defines the Event and EventsRead models, mapping them to Postgres tables.
        - Includes Prisma client generator.
   - `services/write-service-ts/prisma/migrations/20250101_init/migration.sql`
        - Creates the main events table with full schema and timestamp defaults.
        - Seeds initial events used for testing and demonstration.
   - `services/write-service-ts/prisma/migrations/20250102_events_read_replica/migration.sql`
        - Creates the events_read table.
        - Defines the PostgreSQL trigger sync_events_to_read() to perform pg_notify('events_changed', payload) for SSE.

### Read-Service (Go)

   - `services/read-service-go/Dockerfile`
        - Multi-stage build producing a static Go binary.
        - Uses distroless final image that is extremely secure.
        - Produces a ~10MB image ideal for scaled deployments.
   - `services/read-service-go/cmd/readsvc/main.go`
        - Service entry point that sets up routes, CORS wrappers, and server configuration.
        - Connects to PostgreSQL, starts the notifier listener, and configures SSE.
        - Implements health check endpoint (/healthz) used by startup script.
   - `services/read-service-go/internal/db/db.go`
        - Manages PGX connection pool creation and database connectivity.
        - Defines Pool, shared by all handlers for efficient query reuse.
        - Sets pool settings such as MaxConns, ensuring scalable read throughput.
   - `services/read-service-go/internal/handlers/events.go`
        - Implements GET /events and GET /events/:id.
        - Scans rows from events_read and normalizes nullable fields.
   - `services/read-service-go/internal/handlers/notifier.go`
        - Runs a goroutine listening on Postgres LISTEN events_changed.
        - Sends real-time payloads to the SSE handler via a buffered channel.
        - Acts as the internal “pub-sub” model for the read-service.
   - `services/read-service-go/internal/handlers/sse.go`
        - Implements a full SSE server.
        - Sends heartbeats every 15 seconds to maintain connectivity.
        - Ensures clients automatically receive DB changes with no polling.
