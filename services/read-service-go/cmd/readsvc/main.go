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
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
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
	if err := db.Connect(ctx); err != nil {
		log.Fatalf("[read-service] failed to connect db: %v", err)
	}

	handlers.StartNotifier()

	mux := http.NewServeMux()
	mux.HandleFunc("/events/stream", handlers.SSEHandler)
	mux.HandleFunc("/events", withCORS(handlers.ListEvents))
	mux.HandleFunc("/events/", withCORS(handlers.GetEvent))
	mux.HandleFunc("/healthz", withCORS(healthCheckHandler))

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	addr := host + ":" + port
	srv := &http.Server{
		Addr:              addr,
		ReadHeaderTimeout: 5 * time.Second,
		Handler:           mux,
	}

	log.Printf("[read-service] listening on %s", addr)
	log.Fatal(srv.ListenAndServe())
}
