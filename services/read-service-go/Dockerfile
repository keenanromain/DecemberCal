FROM golang:1.23 AS builder

WORKDIR /app

COPY . .

RUN go mod download

# Build ARM64 binary for M1/M2 Mac Docker
RUN GOARCH=arm64 GOOS=linux go build -o readsvc ./cmd/readsvc


# --------------------------
# Runtime (Debian slim)
# --------------------------
FROM debian:stable-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    apt-get clean

COPY --from=builder /app/readsvc ./readsvc

EXPOSE 4001

CMD ["./readsvc"]
