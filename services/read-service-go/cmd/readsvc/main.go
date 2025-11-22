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

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

		// Handle preflight
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	ctx := context.Background()
	if err := db.Connect(ctx); err != nil {
		log.Fatal(err)
	}

	r := mux.NewRouter()

	// Register routes BEFORE wrapping with CORS
	r.HandleFunc("/events", handlers.ListEvents).Methods("GET")
	r.HandleFunc("/events/{id}", handlers.GetEvent).Methods("GET")

	// Wrap router in CORS middleware
	handler := corsMiddleware(r)

	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := host + ":" + port

	srv := &http.Server{
		Addr:         addr,
		Handler:      handler, // <-- IMPORTANT: use handler, not r
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Read service listening on %s", addr)
	log.Fatal(srv.ListenAndServe())
}
