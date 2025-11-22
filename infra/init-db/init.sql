-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    start timestamptz NOT NULL,
    "end" timestamptz NOT NULL,
    location TEXT,
    online_link TEXT,
    min_attendees INT,
    max_attendees INT,
    location_notes TEXT,
    preparation_notes TEXT,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create materialized view for read model
DROP MATERIALIZED VIEW IF EXISTS events_read;

CREATE MATERIALIZED VIEW events_read AS
SELECT
    id,
    name,
    description,
    start,
    "end",
    location,
    online_link,
    min_attendees,
    max_attendees,
    location_notes,
    preparation_notes,
    created_at,
    updated_at
FROM events;

-- REQUIRED for CONCURRENT refresh
CREATE UNIQUE INDEX events_read_id_idx ON events_read(id);