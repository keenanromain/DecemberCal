package handlers

import (
	"context"
	"log"
	"readservice/internal/db"
)

var changesChan = make(chan []byte, 100)

func Changes() <-chan []byte {
	return changesChan
}

func StartNotifier() {
	go func() {
		conn, err := db.Pool.Acquire(context.Background())
		if err != nil {
			log.Fatalf("[notifier] acquire failed: %v", err)
		}
		defer conn.Release()

		_, err = conn.Exec(context.Background(), "LISTEN events_changed;")
		if err != nil {
			log.Fatalf("[notifier] LISTEN failed: %v", err)
		}

		log.Println("[notifier] listening on events_changed")

		for {
			notification, err := conn.Conn().WaitForNotification(context.Background())
			if err != nil {
				log.Printf("[notifier] error: %v", err)
				continue
			}
			changesChan <- []byte(notification.Payload)
		}
	}()
}
