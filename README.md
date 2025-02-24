# Obesrvability on docker-compose

## Introduction

This project is a simple example of how to use observability tools in a docker-compose environment. The tools used are:

- VictoriaMetrics for metrics
- Grafana for visualization
- Loki for logs
- Vector for logs and metrics routing
- Jaeger for tracing
- Tempo for tracing

## How to run

First need create external network for docker-compose:

```bash
docker network create monitoring
```

Then run the following command:

```bash
docker compose up -d
```

and run example app with:

```bash
cd examples/laravel && docker compose up -d
```