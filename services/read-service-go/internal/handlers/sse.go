package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

func SSEHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Immediately open the stream
	fmt.Fprintf(w, ": connected\n\n")
	flusher.Flush()

	// Tell frontend to run initial load
	fmt.Fprintf(w, "event: connected\ndata: \"ok\"\n\n")
	flusher.Flush()

	// Heartbeat
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	// Listen to global change notifications
	notify := Changes()

	for {
		select {
		case msg := <-notify:
			fmt.Fprintf(w, "event: update\ndata: %s\n\n", msg)
			flusher.Flush()

		case <-ticker.C:
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()

		case <-r.Context().Done():
			log.Println("[sse] client disconnected")
			return
		}
	}
}
