package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/keenanromain/decembercal/readservice/internal/db"
	"github.com/keenanromain/decembercal/readservice/internal/handlers"
)

func main() {
	ctx := context.Background()
	if err := db.Connect(ctx); err != nil {
		log.Fatal(err)
	}
	r := mux.NewRouter()
	r.HandleFunc("/events", handlers.ListEvents).Methods("GET")
	r.HandleFunc("/events/{id}", handlers.GetEvent).Methods("GET")
	host := "0.0.0.0"
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := host + ":" + port
	srv := &http.Server{Addr: addr, Handler: r, ReadTimeout: 5 * time.Second,
		WriteTimeout: 10 * time.Second}
	log.Printf("Read service listening on %s", addr)
	log.Fatal(srv.ListenAndServe())
}
