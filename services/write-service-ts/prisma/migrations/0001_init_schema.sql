-- 0001_init_schema.sql
-- Baseline schema for DecemberCal

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------
--  Primary events table
-- -------------------------
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,
    description TEXT,
    start TIMESTAMPTZ NOT NULL,
    "end" TIMESTAMPTZ NOT NULL,

    location TEXT,
    online_link TEXT,

    min_attendees INT,
    max_attendees INT,

    location_notes TEXT,
    preparation_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
CREATE INDEX IF NOT EXISTS idx_events_end ON events("end");

COMMIT;
