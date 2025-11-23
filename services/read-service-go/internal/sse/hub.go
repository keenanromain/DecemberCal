package sse

import "log"

// Client is a channel over which JSON payloads are sent to a single SSE connection.
type Client chan []byte

// Hub manages all connected SSE clients and broadcasts messages to them.
type Hub struct {
	Clients    map[Client]bool
	Register   chan Client
	Unregister chan Client
	Broadcast  chan []byte
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[Client]bool),
		Register:   make(chan Client),
		Unregister: make(chan Client),
		Broadcast:  make(chan []byte),
	}
}

// Run starts the hub event loop. Call this once from main in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			log.Printf("[sse] client registered (total: %d)", len(h.Clients))

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client)
				log.Printf("[sse] client unregistered (total: %d)", len(h.Clients))
			}

		case msg := <-h.Broadcast:
			// msg MUST be a single JSON blob (no SSE framing here)
			for client := range h.Clients {
				select {
				case client <- msg:
				default:
					// client is stuck; clean it up
					delete(h.Clients, client)
					close(client)
					log.Printf("[sse] dropped slow client (total: %d)", len(h.Clients))
				}
			}
		}
	}
}
