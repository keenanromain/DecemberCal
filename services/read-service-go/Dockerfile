FROM golang:1.21-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /readsvc ./cmd/readsvc
FROM alpine:3.18
COPY --from=builder /readsvc /readsvc
EXPOSE 4001
ENTRYPOINT ["/readsvc"]