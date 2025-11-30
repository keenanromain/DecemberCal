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

// CORS
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

func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Method Not Allowed — read-service only supports GET", http.StatusMethodNotAllowed)
}

func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	status := map[string]string{"service": "read-service"}

	if err := db.Ping(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		status["status"] = "error"
	} else {
		status["status"] = "ok"
	}

	json.NewEncoder(w).Encode(status)
}

func main() {
	ctx := context.Background()

	// connect to DB
	if err := db.Connect(ctx); err != nil {
		log.Fatal(err)
	}

	// start SSE hub
	go handlers.Hub.Run()

	r := mux.NewRouter()
	r.MethodNotAllowedHandler = http.HandlerFunc(methodNotAllowed)
	r.Use(corsMiddleware)

	// ORDER MATTERS
	r.HandleFunc("/events/stream", handlers.SSEHandler).Methods(http.MethodGet)
	r.HandleFunc("/events", handlers.ListEvents).Methods(http.MethodGet)
	r.HandleFunc("/events/{id}", handlers.GetEvent).Methods(http.MethodGet)
	r.HandleFunc("/healthz", HealthCheckHandler).Methods(http.MethodGet)

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	server := &http.Server{
		Addr:    host + ":" + port,
		Handler: r,
	}

	log.Printf("Read-service listening on %s", host+":"+port)
	log.Fatal(server.ListenAndServe())
}
