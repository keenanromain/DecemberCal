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
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// HealthCheckHandler verifies DB connectivity and reports service health.
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	if err := db.Ping(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"error","service":"read-service"}`))
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok","service":"read-service"}`))
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

	// ------------------------------------------------------------------
	// 🚨 ORDER MATTERS — SSE ROUTE MUST COME BEFORE "/events/{id}"
	// ------------------------------------------------------------------

	// Server-Sent Events Stream
	r.HandleFunc("/events/stream", handlers.SSEHandler).Methods("GET")

	// List events
	r.HandleFunc("/events", handlers.ListEvents).Methods("GET")

	// Get single event by ID
	r.HandleFunc("/events/{id}", handlers.GetEvent).Methods("GET")

	// Health Check
	r.HandleFunc("/healthz", HealthCheckHandler).Methods("GET")

	// Optional startup broadcast (helps verify SSE works)
	go func() {
		time.Sleep(2 * time.Second)
		handlers.Hub.Broadcast <- []byte(`{"type":"startup","msg":"SSE online"}`)
	}()

	// ------------------------------------------------------------------

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := host + ":" + port

	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Read-service listening on %s (GET ONLY)", addr)
	log.Fatal(server.ListenAndServe())
}
