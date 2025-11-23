-- 0005_seed_test_data.sql
-- Optional sample events

BEGIN;

INSERT INTO events (name, description, start, "end", location)
VALUES 
  ('Hometown visit', 'family dinner', '2025-12-08T18:00Z', '2025-12-08T22:00Z', 'NYC'),
  ('Christmas Day', 'Best time of the year', '2025-12-25T18:00Z', '2025-12-25T22:00Z', 'NYC'),
  ('NYE!', 'Out with the old, in with the new', '2025-12-31T14:00Z', '2025-12-31T15:30Z', 'Online');

COMMIT;
