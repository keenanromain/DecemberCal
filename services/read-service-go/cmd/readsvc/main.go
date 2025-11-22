package main

import (
	"context"
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// HealthCheckHandler verifies DB connectivity and returns service health.
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err := db.Ping(ctx)
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"error","service":"read-service"}`))
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok","service":"read-service"}`))
}

// methodNotAllowed enforces the CQRS rule that the read-service only processes GET requests.
func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method Not Allowed — read-service only supports GET", http.StatusMethodNotAllowed)
}

func main() {
	ctx := context.Background()

	if err := db.Connect(ctx); err != nil {
		log.Fatal(err)
	}

	r := mux.NewRouter()
	r.MethodNotAllowedHandler = http.HandlerFunc(methodNotAllowed)

	// Apply CORS wrapper
	r.Use(corsMiddleware)

	// GET-only routes
	r.HandleFunc("/events", handlers.ListEvents).Methods("GET")
	r.HandleFunc("/events/{id}", handlers.GetEvent).Methods("GET")

	// Register /healthz as health check
	r.HandleFunc("/healthz", HealthCheckHandler).Methods("GET")

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := host + ":" + port

	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Read-service listening on %s (GET ONLY)", addr)
	log.Fatal(srv.ListenAndServe())
}
