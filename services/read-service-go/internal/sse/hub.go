package sse

import (
	"log"
)

type Client chan []byte

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

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			log.Println("[sse] client connected")

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client)
				log.Println("[sse] client disconnected")
			}

		case msg := <-h.Broadcast:
			for client := range h.Clients {
				select {
				case client <- msg:
				default:
					delete(h.Clients, client)
					close(client)
				}
			}
		}
	}
}
