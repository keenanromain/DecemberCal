-- 1. Ensure read-replica exists
CREATE TABLE IF NOT EXISTS events_read (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    start TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "end" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location TEXT,
    online_link TEXT,
    min_attendees INTEGER,
    max_attendees INTEGER,
    location_notes TEXT,
    preparation_notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- 2. Create sync + notify function
CREATE OR REPLACE FUNCTION sync_events_to_read()
RETURNS trigger AS $$
DECLARE
    payload JSON;
    event_id TEXT;
BEGIN
    -- Determine event ID depending on op
    event_id := COALESCE(NEW.id, OLD.id);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO events_read SELECT NEW.*;

        payload := json_build_object(
            'type', 'insert',
            'id', event_id,
            'timestamp', extract(epoch from now())
        );

    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE events_read SET
            name = NEW.name,
            description = NEW.description,
            start = NEW.start,
            "end" = NEW."end",
            location = NEW.location,
            online_link = NEW.online_link,
            min_attendees = NEW.min_attendees,
            max_attendees = NEW.max_attendees,
            location_notes = NEW.location_notes,
            preparation_notes = NEW.preparation_notes,
            created_at = NEW.created_at,
            updated_at = NEW.updated_at
        WHERE id = NEW.id;

        payload := json_build_object(
            'type', 'update',
            'id', event_id,
            'timestamp', extract(epoch from now())
        );

    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM events_read WHERE id = OLD.id;

        payload := json_build_object(
            'type', 'delete',
            'id', event_id,
            'timestamp', extract(epoch from now())
        );
    END IF;

    -- Push notification to Go → SSE → frontend
    PERFORM pg_notify('events_changed', payload::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind trigger
DROP TRIGGER IF EXISTS sync_events_read ON events;

CREATE TRIGGER sync_events_read
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION sync_events_to_read();

-- 4. Backfill read replica
INSERT INTO events_read
SELECT * FROM events;