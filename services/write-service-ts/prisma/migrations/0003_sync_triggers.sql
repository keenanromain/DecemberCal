-- 0003_sync_triggers.sql
-- Mirrors INSERT/UPDATE/DELETE from events → events_read

BEGIN;

-- INSERT/UPDATE sync
CREATE OR REPLACE FUNCTION sync_events_read() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO events_read
        SELECT NEW.*;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_events_read ON events;

CREATE TRIGGER trg_sync_events_read
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION sync_events_read();

-- DELETE sync
CREATE OR REPLACE FUNCTION sync_events_read_delete() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM events_read WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_events_read_delete ON events;

CREATE TRIGGER trg_sync_events_read_delete
AFTER DELETE ON events
FOR EACH ROW
EXECUTE FUNCTION sync_events_read_delete();

COMMIT;
