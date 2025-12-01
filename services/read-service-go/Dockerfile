# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN GOOS=linux GOARCH=arm64 go build -o readsvc ./cmd/readsvc

# Runtime
FROM gcr.io/distroless/base-debian12

WORKDIR /app
COPY --from=builder /app/readsvc ./readsvc

CMD ["./readsvc"]
