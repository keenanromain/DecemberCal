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

	"github.com/gorilla/mux"
)

// corsMiddleware applies CORS headers to all incoming requests.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// HealthCheckHandler verifies DB connectivity and reports service health.
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	status := map[string]string{"service": "read-service"}

	if err := db.Ping(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		status["status"] = "error"
	} else {
		w.WriteHeader(http.StatusOK)
		status["status"] = "ok"
	}

	json.NewEncoder(w).Encode(status)
}

// methodNotAllowed enforces CQRS (read service only supports GET).
func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method Not Allowed — read-service only supports GET", http.StatusMethodNotAllowed)
}

func main() {
	ctx := context.Background()

	// Connect to database
	if err := db.Connect(ctx); err != nil {
		log.Fatal(err)
	}

	// Start SSE Hub
	go handlers.Hub.Run()

	r := mux.NewRouter()
	r.MethodNotAllowedHandler = http.HandlerFunc(methodNotAllowed)

	// Apply CORS
	r.Use(corsMiddleware)

	// 🚨 ORDER MATTERS — specific routes BEFORE "/events/{id}"

	// SSE stream for frontend
	r.HandleFunc("/events/stream", handlers.SSEHandler).Methods(http.MethodGet)

	// List events (reads from materialized view)
	r.HandleFunc("/events", handlers.ListEvents).Methods(http.MethodGet)

	// Get single event by ID
	r.HandleFunc("/events/{id}", handlers.GetEvent).Methods(http.MethodGet)

	// Health check
	r.HandleFunc("/healthz", HealthCheckHandler).Methods(http.MethodGet)

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := host + ":" + port

	server := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	log.Printf("Read-service listening on %s (GET ONLY, SSE enabled)", addr)
	log.Fatal(server.ListenAndServe())
}
