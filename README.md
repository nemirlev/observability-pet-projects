# Observability Stack на Docker Compose (Grafana LGTM + RUM + Pyroscope)

Готовый к запуску стек наблюдаемости на базе экосистемы Grafana: метрики, логи, трейсы, профили (Pyroscope) и RUM (Real User Monitoring) в одном окружении.

## Версии компонентов

| Компонент   | Образ                         | Назначение                    |
|------------|-------------------------------|--------------------------------|
| **Grafana**   | grafana/grafana:12.4.0       | Визуализация, дашборды        |
| **Loki**      | grafana/loki:3.6.7           | Логи                          |
| **Tempo**     | grafana/tempo:2.10.1          | Трейсы                        |
| **Mimir**     | grafana/mimir:3.0.3          | Метрики (Prometheus-совместимый API) |
| **Pyroscope**   | grafana/pyroscope:1.13.2      | Continuous profiling          |
| **Alloy**       | grafana/alloy:v1.13.2         | Приём OTLP + Faro RUM, маршрутизация |
| **Alertmanager** | prom/alertmanager:latest     | Маршрутизация алертов (Loki Ruler → сюда) |
| **Sentry**       | getsentry/sentry:latest     | Отлов ошибок (error tracking)             |
| **Grafana Faro** | Alloy faro.receiver + [@grafana/faro-web-sdk](https://www.npmjs.com/package/@grafana/faro-web-sdk) | RUM: приём в Alloy :12347, SDK в браузере |

## Состав стека и порты

| Сервис     | Порт(ы) | Описание |
|-----------|---------|----------|
| **Grafana**   | 3000    | Единая точка входа, дашборды |
| **Loki**      | 3100    | Приём и хранение логов |
| **Tempo**     | 3200    | Хранение трейсов |
| **Mimir**     | 9009    | Хранение метрик |
| **Pyroscope** | 4040    | Приём профилей (push), запросы |
| **Alloy**        | 4317 (gRPC), 4318 (HTTP), 12345 (UI), 12347 (Faro) | Телеметрия и RUM (Faro collector на :12347) |
| **Alertmanager** | 9093    | Приём алертов от Loki Ruler, маршрутизация в Slack/email/webhook |
| **Sentry**       | 9000    | Web UI, приём событий (DSN для приложений) |

## Архитектура

```
  OTLP (apps) ──────►  ┌─────────────────────────────────────────────────┐
  :4317 / :4318       │                   Grafana Alloy                  │
  Faro (browser) ───►  │  OTLP + Faro RUM → batch → Loki / Tempo / Mimir │
  :12347               └─────────────────────────────────────────────────┘
  Profiles (push) ──►  Pyroscope :4040
                              │
          ┌───────────────────┼───────────────────┬─────────────┐
          ▼                   ▼                    ▼             ▼
     Loki :3100          Tempo :3200          Mimir :9009   Pyroscope :4040
          └───────────────────┼───────────────────┴─────────────┘
                              ▼
                    Grafana :3000 (Loki, Tempo, Mimir, Pyroscope)
```

- **Backend-приложения**: OTLP на Alloy (`localhost:4317` gRPC или `localhost:4318` HTTP) → Loki, Tempo, Mimir.
- **Frontend (RUM)**: **Grafana Faro** — в браузер добавляете [@grafana/faro-web-sdk](https://www.npmjs.com/package/@grafana/faro-web-sdk), endpoint `http://localhost:12347/collect` → Alloy (faro.receiver) → Loki (логи), Tempo (трейсы).
- **Профили**: приложения шлют профили в Pyroscope по HTTP (например `http://localhost:4040/ingest`); в Grafana используется источник данных Pyroscope.

## Требования

- Docker и Docker Compose (v2+)
- Сеть `monitoring` создаётся при первом запуске

## Запуск

```bash
docker network create monitoring
docker compose up -d
```

Проверка:

```bash
docker compose ps
```

После старта:

- **Grafana**: http://localhost:3000 (анонимный доступ включён для демо)
- **Alloy UI**: http://localhost:12345
- **Sentry**: http://localhost:9000 (после первого запуска — см. раздел Sentry ниже)

## Эндпоинты для инструментирования

| Назначение              | Адрес | Протокол / примечание |
|-------------------------|--------|-------------------------|
| OTLP (метрики, логи, трейсы) | `http://localhost:4318` | OTLP HTTP |
| OTLP gRPC               | `localhost:4317` | OTLP gRPC |
| RUM (Faro)              | `http://localhost:12347/collect` | HTTP (Faro SDK) |
| Профили (Pyroscope)     | `http://localhost:4040/ingest`   | HTTP push |

В production замените `localhost` на hostname/домен Alloy (и при необходимости Pyroscope) и настройте CORS для Faro в `configs/alloy/alloy.alloy`.

## Sentry (error tracking)

**Sentry** — отлов и хранение ошибок из приложений (backend, frontend, мобильные). В стек добавлены сервисы: `sentry-postgres`, `sentry-redis`, `sentry`.

1. **Первый запуск** — задайте секретный ключ и при необходимости пароль БД (или используйте значения по умолчанию из `.env.example`):

   ```bash
   cp .env.example .env
   # Сгенерировать SENTRY_SECRET_KEY: openssl rand -hex 32
   # Вписать ключ в .env в SENTRY_SECRET_KEY=
   ```

2. **Инициализация БД и создание суперпользователя** (один раз):

   ```bash
   docker compose run --rm sentry sentry upgrade
   ```

   В процессе создаётся учётная запись администратора (email и пароль).

3. **Запуск стека** (если ещё не запущен):

   ```bash
   docker compose up -d
   ```

4. **Вход**: http://localhost:9000 — войдите под созданным админом, создайте организацию и проект, скопируйте DSN и подключите [Sentry SDK](https://docs.sentry.io/platforms/) в приложения.

Минимальный набор (Postgres + Redis + Sentry) подходит для разработки и небольших объёмов. Для production с большим трафиком рекомендуется [официальный self-hosted](https://github.com/getsentry/self-hosted) (Kafka, ClickHouse, Snuba и др.).

## Grafana Faro (RUM)

**Grafana Faro** — это RUM (Real User Monitoring) для фронтенда: ошибки, Web Vitals, логи консоли и трейсы отправляются в Loki и Tempo без бэкенда.

1. **Collector** уже в стеке: в Alloy включён `faro.receiver` на порту **12347** (см. `configs/alloy/alloy.alloy`). Данные с браузера уходят на `http://<host>:12347/collect`.

2. **Подключение в приложении** — установите SDK и инициализируйте до любого другого кода:

   ```bash
   npm install @grafana/faro-web-sdk
   ```

   ```javascript
   import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

   initializeFaro({
     url: 'http://localhost:12347/collect',
     app: { name: 'my-app', version: '1.0.0' },
     instrumentations: [...getWebInstrumentations()],
   });
   ```

   Для локальной разработки с другим origin (например, `http://127.0.0.1:5173`) CORS уже разрешён в Alloy (`cors_allowed_origins = ["*"]`). В production укажите свой домен в `configs/alloy/alloy.alloy` в блоке `faro.receiver "rum"`.

3. **Проверка**: откройте приложение, сгенерируйте ошибку или навигацию — в Grafana в Loki появятся логи с меткой `app="my-app"`, в Tempo — трейсы.

## Конфигурация

- **Loki**: `configs/loki/loki-config.yaml` — single binary, filesystem
- **Tempo**: `configs/tempo/tempo-config.yaml` — OTLP, local storage
- **Mimir**: `configs/mimir/mimir-config.yaml` — single process, filesystem (для разработки)
- **Pyroscope**: `configs/pyroscope/pyroscope-config.yaml` — single binary, filesystem
- **Alloy**: `configs/alloy/alloy.alloy` — OTLP + **Grafana Faro** (faro.receiver :12347) → Loki/Tempo/Mimir
- **Grafana**: `configs/grafana/provisioning/datasources/datasources.yaml` — Loki, Tempo, Mimir, Pyroscope

Данные хранятся в томах: `loki_data`, `tempo_data`, `mimir_data`, `pyroscope_data`, `alloy_data`, `grafana_data`, `sentry_redis_data`, `sentry_postgres_data`.

## Остановка

```bash
docker compose down
```

С томами:

```bash
docker compose down -v
```

## Предупреждения

- Конфигурации Mimir, Loki и Pyroscope рассчитаны на разработку/тесты; для production нужны объектное хранилище (S3/GCS), отдельные инстансы и лимиты.
- RUM (Faro): по умолчанию `cors_allowed_origins = ["*"]`; в production укажите конкретные домены.
