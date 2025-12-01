package handlers

import (
	"encoding/json"
	"net/http"
	"readservice/internal/db"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

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

func ListEvents(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Pool.Query(r.Context(), `
		SELECT 
			id, name, description, start, "end",
			location, online_link,
			min_attendees, max_attendees,
			location_notes, preparation_notes
		FROM events_read
		ORDER BY start ASC
	`)
	if err != nil {
		http.Error(w, "db query failed: "+err.Error(), 500)
		return
	}
	defer rows.Close()

	events := []Event{}

	for rows.Next() {
		var e Event
		var (
			location         *string
			onlineLink       *string
			locationNotes    *string
			preparationNotes *string
			min              *int32
			max              *int32
		)

		err := rows.Scan(
			&e.ID,
			&e.Name,
			&e.Description,
			&e.Start,
			&e.End,
			&location,
			&onlineLink,
			&min,
			&max,
			&locationNotes,
			&preparationNotes,
		)
		if err != nil {
			http.Error(w, "scan failed: "+err.Error(), 500)
			return
		}

		// Normalize int32 → int
		if min != nil {
			v := int(*min)
			e.MinAttendees = &v
		}
		if max != nil {
			v := int(*max)
			e.MaxAttendees = &v
		}

		e.Location = location
		e.OnlineLink = onlineLink
		e.LocationNotes = locationNotes
		e.PreparationNotes = preparationNotes

		events = append(events, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func GetEvent(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/events/")
	if id == "" {
		http.Error(w, "missing id", 400)
		return
	}

	var (
		e                Event
		location         *string
		onlineLink       *string
		locationNotes    *string
		preparationNotes *string
		min              *int32
		max              *int32
	)

	err := db.Pool.QueryRow(r.Context(), `
		SELECT 
			id, name, description, start, "end",
			location, online_link,
			min_attendees, max_attendees,
			location_notes, preparation_notes
		FROM events_read
		WHERE id = $1
	`, id).Scan(
		&e.ID,
		&e.Name,
		&e.Description,
		&e.Start,
		&e.End,
		&location,
		&onlineLink,
		&min,
		&max,
		&locationNotes,
		&preparationNotes,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "not found", 404)
			return
		}
		http.Error(w, "scan failed: "+err.Error(), 500)
		return
	}

	if min != nil {
		v := int(*min)
		e.MinAttendees = &v
	}
	if max != nil {
		v := int(*max)
		e.MaxAttendees = &v
	}

	e.Location = location
	e.OnlineLink = onlineLink
	e.LocationNotes = locationNotes
	e.PreparationNotes = preparationNotes

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}
