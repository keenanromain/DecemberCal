-- 0004_notify_trigger.sql
-- Push NOTIFY events_changed(JSON)

BEGIN;

CREATE OR REPLACE FUNCTION notify_events_changed()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    payload := json_build_object(
        'type', 'refresh',
        'table', TG_TABLE_NAME,
        'timestamp', extract(epoch from now())
    );

    PERFORM pg_notify('events_changed', payload::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_events_changed ON events;

CREATE TRIGGER trg_notify_events_changed
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW
EXECUTE FUNCTION notify_events_changed();

COMMIT;
