FROM golang:1.24-alpine AS builder

WORKDIR /build

COPY ./go.mod ./go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o go-app main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /build/go-app /app/go-app

USER appuser

WORKDIR /app

EXPOSE 8080

ENTRYPOINT ["/app/go-app", "sync", "-d"]