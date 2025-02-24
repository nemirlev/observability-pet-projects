# Obesrvability on docker-compose

## Introduction

This project is a simple example of how to use observability tools in a docker-compose environment. The tools used are:

- VictoriaMetrics for metrics
- Grafana for visualization
- Loki for logs
- Vector for logs and metrics routing

Vector будет собирать логи и метрики из ваших приложений в Docker и отправлять их в Loki (логи) и VictoriaMetrics (метрики).
Loki сохраняет логи и предоставляет API для их запросов.
VictoriaMetrics хранит метрики в формате временных рядов.
Grafana подключается к Loki и VictoriaMetrics как к источникам данных для построения дашбордов.

## How to run

First need create external network for docker-compose:

```bash
docker network create monitoring
```

Then run the following command:

```bash
docker compose up -d
```