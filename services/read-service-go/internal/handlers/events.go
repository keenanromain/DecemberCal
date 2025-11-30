package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"readservice/internal/db"
	"time"

	"github.com/jackc/pgx/v5"
)

// Event represents the API response returned by the read-service.
type Event struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Start            time.Time `json:"start"`
	End              time.Time `json:"end"`
	Location         *string   `json:"location"`
	OnlineLink       *string   `json:"online_link"`
	MinAttendees     *int      `json:"min_attendees"`
	MaxAttendees     *int      `json:"max_attendees"`
	LocationNotes    *string   `json:"location_notes"`
	PreparationNotes *string   `json:"preparation_notes"`
}

// ListEvents handles GET /events
func ListEvents(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Pool.Query(r.Context(), `
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
			preparation_notes
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
		var loc, link, locNotes, prepNotes sql.NullString
		var min, max sql.NullInt32

		err := rows.Scan(
			&e.ID,
			&e.Name,
			&e.Description,
			&e.Start,
			&e.End,
			&loc,
			&link,
			&min,
			&max,
			&locNotes,
			&prepNotes,
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if loc.Valid {
			val := loc.String
			e.Location = &val
		}

		if link.Valid {
			val := link.String
			e.OnlineLink = &val
		}

		if min.Valid {
			v := int(min.Int32)
			e.MinAttendees = &v
		}

		if max.Valid {
			v := int(max.Int32)
			e.MaxAttendees = &v
		}

		if locNotes.Valid {
			val := locNotes.String
			e.LocationNotes = &val
		}

		if prepNotes.Valid {
			val := prepNotes.String
			e.PreparationNotes = &val
		}

		events = append(events, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// GetEvent handles GET /events/{id}
func GetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/events/"):] // simple routing extraction

	row := db.Pool.QueryRow(r.Context(), `
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
			preparation_notes
		FROM events_read
		WHERE id=$1
	`, id)

	var e Event
	var loc, link, locNotes, prepNotes sql.NullString
	var min, max sql.NullInt32

	err := row.Scan(
		&e.ID,
		&e.Name,
		&e.Description,
		&e.Start,
		&e.End,
		&loc,
		&link,
		&min,
		&max,
		&locNotes,
		&prepNotes,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if loc.Valid {
		val := loc.String
		e.Location = &val
	}

	if link.Valid {
		val := link.String
		e.OnlineLink = &val
	}

	if min.Valid {
		v := int(min.Int32)
		e.MinAttendees = &v
	}

	if max.Valid {
		v := int(max.Int32)
		e.MaxAttendees = &v
	}

	if locNotes.Valid {
		val := locNotes.String
		e.LocationNotes = &val
	}

	if prepNotes.Valid {
		val := prepNotes.String
		e.PreparationNotes = &val
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}
