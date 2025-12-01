package db

import (
	"context"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect(ctx context.Context) error {
	url := os.Getenv("DATABASE_URL")
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return err
	}

	cfg.MaxConns = 10

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return err
	}

	Pool = pool

	ctxPing, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return Pool.Ping(ctxPing)
}

func Ping(ctx context.Context) error {
	return Pool.Ping(ctx)
}
