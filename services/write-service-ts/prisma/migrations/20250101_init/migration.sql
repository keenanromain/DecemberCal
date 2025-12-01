CREATE TABLE "events" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "online_link" TEXT,
    "min_attendees" INTEGER,
    "max_attendees" INTEGER,
    "location_notes" TEXT,
    "preparation_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial events
INSERT INTO "events" (
    "id",
    "name",
    "description",
    "start",
    "end",
    "location",
    "online_link",
    "min_attendees",
    "max_attendees",
    "location_notes",
    "preparation_notes"
) VALUES
    (
        'evt-hometown',
        'Hometown Visit',
        'Monthly Family Dinner',
        '2025-12-08T23:00:00Z',
        '2025-12-08T24:00:00Z',
        'Morristown',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'evt-christmas',
        'Christmas Day',
        'The best time of the year!',
        '2025-12-25T14:00:00Z',
        '2025-12-25T22:00:00Z',
        'NYC',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'evt-nye',
        'NYE!',
        'Out with the old, in with the new',
        '2025-12-31T14:00:00Z',
        '2025-12-31T22:00:00Z',
        'San Francisco',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    );


