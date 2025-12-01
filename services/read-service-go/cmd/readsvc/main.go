// cmd/readsvc/main.go
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"readservice/internal/db"
	"readservice/internal/handlers"
)

// CORS wrapper
func withCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		handler(w, r)
	}
}

// Health endpoint
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(r.Context(), time.Second)
	defer cancel()

	status := map[string]string{"service": "read-service"}

	if err := db.Ping(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		status["status"] = "error"
	} else {
		status["status"] = "ok"
	}

	_ = json.NewEncoder(w).Encode(status)
}

func main() {
	ctx := context.Background()

	// Connect to DB
	if err := db.Connect(ctx); err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()

	// SSE: already sets its own CORS + headers
	mux.HandleFunc("/events/stream", handlers.SSEHandler)

	// EXACT MATCH: /events
	mux.HandleFunc("/events", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/events" {
			http.NotFound(w, r)
			return
		}
		handlers.ListEvents(w, r)
	}))

	// PREFIX MATCH: /events/{id}
	mux.HandleFunc("/events/", withCORS(handlers.GetEvent))

	// Health check
	mux.HandleFunc("/healthz", withCORS(HealthCheckHandler))

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	server := &http.Server{
		Addr:    host + ":" + port,
		Handler: mux,
	}

	log.Printf("read-service listening on %s", host+":"+port)
	log.Fatal(server.ListenAndServe())
}
