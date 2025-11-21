package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/keenanromain/decembercal/readservice/internal/db"
)

// Event represents the shape of a single event returned by the read service
type Event struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Start           time.Time `json:"start"`
	End             time.Time `json:"end"`
	LocationDisplay string    `json:"location_display"`
	MinAttendees    *int      `json:"min_attendees"`
	MaxAttendees    *int      `json:"max_attendees"`
}

// ListEvents handles GET /events
func ListEvents(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Pool.Query(r.Context(), `
		SELECT id, name, description, start, "end", location_display, min_attendees, max_attendees
		FROM events_read
		ORDER BY start ASC
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		var min, max pgx.NullInt32
		if err := rows.Scan(&e.ID, &e.Name, &e.Description, &e.Start, &e.End, &e.LocationDisplay, &min, &max); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if min.Valid {
			mv := int(min.Int32)
			e.MinAttendees = &mv
		}
		if max.Valid {
			mv := int(max.Int32)
			e.MaxAttendees = &mv
		}
		events = append(events, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// GetEvent handles GET /events/{id}
func GetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/events/"):] // simple path extraction
	row := db.Pool.QueryRow(r.Context(), `
		SELECT id, name, description, start, "end", location_display, min_attendees, max_attendees
		FROM events_read
		WHERE id=$1
	`, id)

	var e Event
	var min, max pgx.NullInt32
	if err := row.Scan(&e.ID, &e.Name, &e.Description, &e.Start, &e.End, &e.LocationDisplay, &min, &max); err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if min.Valid {
		mv := int(min.Int32)
		e.MinAttendees = &mv
	}
	if max.Valid {
		mv := int(max.Int32)
		e.MaxAttendees = &mv
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}
