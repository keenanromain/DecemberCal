package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"readservice/internal/sse"
)

var Hub = sse.NewHub()

func SSEHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	clientChan := make(sse.Client)
	Hub.Register <- clientChan
	log.Println("[SSE] client connected")

	ctx := r.Context()
	go func() {
		<-ctx.Done()
		Hub.Unregister <- clientChan
		log.Println("[SSE] client disconnected")
	}()

	fmt.Fprintf(w, "event: connected\ndata: \"ok\"\n\n")
	flusher.Flush()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case msg := <-clientChan:
			_, err := fmt.Fprintf(w, "event: update\ndata: %s\n\n", msg)
			if err != nil {
				log.Println("[SSE] write failed, closing connection")
				return
			}
			flusher.Flush()

		case <-heartbeat.C:
			_, err := fmt.Fprintf(w, ": heartbeat\n\n")
			if err != nil {
				log.Println("[SSE] heartbeat failed, closing connection")
				return
			}
			flusher.Flush()

		case <-ctx.Done():
			log.Println("[SSE] ctx closed")
			return
		}
	}
}
