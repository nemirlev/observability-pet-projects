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
- Сеть `monitoring` — внешняя, её нужно создать один раз вручную (и основной стек, и пример Next.js подключаются к ней)

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

## Эндпоинты для инструментирования

| Назначение              | Адрес | Протокол / примечание |
|-------------------------|--------|-------------------------|
| OTLP (метрики, логи, трейсы) | `http://localhost:4318` | OTLP HTTP |
| OTLP gRPC               | `localhost:4317` | OTLP gRPC |
| RUM (Faro)              | `http://localhost:12347/collect` | HTTP (Faro SDK) |
| Профили (Pyroscope)     | `http://localhost:4040/ingest`   | HTTP push |

В production замените `localhost` на hostname/домен Alloy (и при необходимости Pyroscope) и настройте CORS для Faro в `configs/alloy/alloy.alloy`.

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

   **Дашборд «Grafana Faro - Frontend Monitoring»** (Loki): для отображения данных в панелях в Alloy заданы лейблы `Application` и `Environment` (`extra_log_labels` в `faro.receiver`). Переменные дашборда по умолчанию: Environment = `development`, Application = `next-app`. Если данных нет — выберите в шапке дашборда те же значения и проверьте диапазон времени (например «Last 24 hours»). Лейбл `kind` (measurement, exception, event) добавляется Alloy из payload Faro (нужна версия Alloy с фиксом [#632](https://github.com/grafana/alloy/pull/632)).

4. **Ограничение (sourcemaps в Docker)**: приложение и Alloy в одной сети (например `nextjs` и `alloy`), но URL во фреймах стека приходят из браузера — это адрес, с которого пользователь открыл приложение (например `http://localhost:3001`), а не внутренний адрес контейнера (`http://nextjs:3000`). В `faro.receiver` **нет опции** указать «для загрузки исходников ходи на этот адрес»; Alloy пытается загрузить по URL из стека и в контейнере не может достучаться до `localhost:3001`. Поэтому в конфиге включено `sourcemaps.download = false` — ошибки в логах исчезают, разрешение стека в исходники отключено. Чтобы это работало изолированно по сети, нужна доработка в Alloy (например `sourcemaps.fetch_base_url` или маппинг origin → внутренний URL). Имеет смысл открыть issue в [grafana/alloy](https://github.com/grafana/alloy/issues) с запросом такой опции.

5. **Проверка, что `sourcemaps.location` работает** (в конфиге включены location + volume в docker-compose):
   - **Важно**: в `npm run dev` Next.js не пишет .map в `.next/static/chunks/`. Чтобы Alloy находил sourcemaps на диске, один раз выполните в `example/next`: `npm run build`. После этого в `.next/static/chunks/` появятся `*.js.map`; перезапустите стек при необходимости.
   - **Метрики в Grafana**: в Explore выберите Mimir, запрос `faro_receiver_sourcemap_file_reads_total` или `faro_receiver_sourcemap_downloads_total` (job=`alloy`). Рост `file_reads` при ошибках во фронте — sourcemaps с диска работают.
   - **Метрики Alloy напрямую**: http://localhost:12345 или `curl -s http://localhost:12345/metrics | grep faro_receiver_sourcemap`.
   - **Loki**: вызовите во фронте ошибку (кнопка в example/next), найдите лог в Loki. Разрешённый стек — исходный файл и строка (`Component.tsx:42:10`); неразрешённый — минифицированный чанк (`chunk_xxx._.js:1:2845`).
   - **Логи Alloy**: при успешном разрешении не должно быть сообщений `Error resolving stack trace frame source location`.

## Конфигурация

- **Loki**: `configs/loki/loki-config.yaml` — single binary, filesystem
- **Tempo**: `configs/tempo/tempo-config.yaml` — OTLP, local storage
- **Mimir**: `configs/mimir/mimir-config.yaml` — single process, filesystem (для разработки)
- **Pyroscope**: `configs/pyroscope/pyroscope-config.yaml` — single binary, filesystem
- **Alloy**: `configs/alloy/alloy.alloy` — OTLP + **Grafana Faro** (faro.receiver :12347) → Loki/Tempo/Mimir
- **Grafana**: `configs/grafana/provisioning/datasources/datasources.yaml` — Loki, Tempo, Mimir, Pyroscope

Данные хранятся в томах: `loki_data`, `tempo_data`, `mimir_data`, `pyroscope_data`, `alloy_data`, `grafana_data`.

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
