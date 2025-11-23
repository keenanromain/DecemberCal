-- 1. Create read replica table
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

-- 2. Create replication + notify function
CREATE OR REPLACE FUNCTION sync_events_to_read() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO events_read SELECT NEW.*;
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
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM events_read WHERE id = OLD.id;
    END IF;

    PERFORM pg_notify(
        'events_changed',
        json_build_object(
            'type', 'refresh',
            'id', COALESCE(NEW.id, OLD.id),
            'timestamp', extract(epoch FROM now())
        )::text
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger binding
DROP TRIGGER IF EXISTS sync_events_read ON events;

CREATE TRIGGER sync_events_read
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION sync_events_to_read();
