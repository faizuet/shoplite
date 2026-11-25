# Stage 1: Build the Go application
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY main.go ./

RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /inventory-service .

# Stage 2: Minimal production runtime
FROM gcr.io/distroless/static-debian13:nonroot

WORKDIR /

COPY --from=builder --chown=65532:65532 /inventory-service /inventory-service

USER 65532:65532

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/inventory-service", "-healthcheck"]

ENTRYPOINT ["/inventory-service"]
