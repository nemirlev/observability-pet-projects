package main

import (
	"context"
	"fmt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/bridges/otelslog"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"log/slog"
	"net/http"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.30.0"
)

var (
	requestCount = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "goapp_http_requests_total",
		Help: "Total number of HTTP requests handled by the Go app",
	})
	responseDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "goapp_response_duration_seconds",
		Help:    "Histogram of response durations for /hello",
		Buckets: prometheus.DefBuckets,
	})
)

func init() {
	// Register the Prometheus metrics with the global prometheus registry
	prometheus.MustRegister(requestCount, responseDuration)
}

func initLogger(ctx context.Context) func() {
	// Create the OTLP log exporter that sends logs to configured destination
	logExporter, err := otlploggrpc.New(ctx, otlploggrpc.WithEndpoint("otel-collector:4317"), otlploggrpc.WithInsecure())
	if err != nil {
		panic(fmt.Sprintf("failed to initialize OTLP log exporter: %v", err))
	}

	// Create a resource with the service name
	res, err := resource.New(ctx,
		resource.WithAttributes(semconv.ServiceNameKey.String("go-app")),
	)
	if err != nil {
		panic(fmt.Sprintf("resource creation error: %v", err))
	}

	// Create a logger provider with the OTLP log exporter
	lp := log.NewLoggerProvider(
		log.WithResource(res),
		log.WithProcessor(log.NewBatchProcessor(logExporter)),
	)

	// Set the global logger provider
	global.SetLoggerProvider(lp)

	// Set the default logger to the OTel logger
	slog.SetDefault(otelslog.NewLogger("go-app"))

	// return a function to shutdown the logger provider
	return func() {
		if err := lp.Shutdown(ctx); err != nil {
			panic(fmt.Sprintf("failed to shutdown logger provider: %v", err))
		}
	}
}

func initTracer(ctx context.Context) func() {
	// Create the OTLP trace exporter that sends spans to configured destination
	exp, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint("otel-collector:4317"),
		otlptracegrpc.WithInsecure())
	if err != nil {
		panic("failed to create trace exporter: " + err.Error())
	}

	// Create a resource with the service name
	res, err := resource.New(ctx,
		resource.WithAttributes(semconv.ServiceNameKey.String("go-app")))
	if err != nil {
		panic(fmt.Sprintf("resource creation error: %v", err))
	}

	// Initialize the OTel SDK with the service name and exporter
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp,
			sdktrace.WithMaxExportBatchSize(512),
			sdktrace.WithBatchTimeout(5*time.Second)),
		sdktrace.WithResource(res),
	)
	// Set the global trace provider
	otel.SetTracerProvider(tp)
	// return a function to shutdown the trace provider
	return func() {
		_ = tp.Shutdown(context.Background())
	}
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
	timer := prometheus.NewTimer(responseDuration)
	defer timer.ObserveDuration()

	ctx := r.Context()
	slog.InfoContext(ctx, "Handling /hello request",
		"method", r.Method,
		"user_agent", r.UserAgent())

	requestCount.Inc()
	_, err := fmt.Fprintln(w, "Hello, Observability!")
	if err != nil {
		slog.Error("Failed to write response", "error", err)
		return
	}
}

func main() {
	ctx := context.Background()
	shutdownTracer := initTracer(ctx)
	defer shutdownTracer()

	shutdownLogger := initLogger(ctx)
	defer shutdownLogger()

	mux := http.NewServeMux()
	mux.Handle("/hello", otelhttp.NewHandler(http.HandlerFunc(helloHandler), "/hello"))
	mux.Handle("/metrics", promhttp.Handler())

	srv := &http.Server{Addr: ":8080", Handler: mux}
	fmt.Printf("Starting server on :8080...")
	if err := srv.ListenAndServe(); err != nil {
		slog.Error("Failed to start server", "error", err)
		os.Exit(1)
	}
}
