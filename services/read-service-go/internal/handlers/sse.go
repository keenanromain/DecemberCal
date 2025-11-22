package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"readservice/internal/sse"
)

var Hub = sse.NewHub()

// SSEHandler upgrades the HTTP connection to a Server-Sent Events stream.
func SSEHandler(w http.ResponseWriter, r *http.Request) {

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	clientChan := make(sse.Client)
	Hub.Register <- clientChan

	log.Println("[SSE] client connected")

	ctx := r.Context()

	// Unregister on disconnect
	go func() {
		<-ctx.Done()
		Hub.Unregister <- clientChan
		log.Println("[SSE] client disconnected")
	}()

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: ok\n\n")
	flusher.Flush()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return

		case msg, ok := <-clientChan:
			if !ok {
				return
			}

			_, err := fmt.Fprintf(w, "event: update\ndata: %s\n\n", msg)
			if err != nil {
				Hub.Unregister <- clientChan
				return
			}
			flusher.Flush()

		case <-heartbeat.C:
			_, err := fmt.Fprintf(w, ": heartbeat\n\n")
			if err != nil {
				Hub.Unregister <- clientChan
				return
			}
			flusher.Flush()
		}
	}
}
