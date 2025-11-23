-- 0002_create_events_read_table.sql
-- Create a real mirror table of the events table (no MV)

BEGIN;

DROP TABLE IF EXISTS events_read;

CREATE TABLE events_read (LIKE events INCLUDING ALL);

ALTER TABLE events_read
    ADD CONSTRAINT events_read_pkey PRIMARY KEY(id);

CREATE INDEX IF NOT EXISTS idx_events_read_start ON events_read(start);

COMMIT;
