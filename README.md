# hotel

OpenTelemetry collector on Cloudflare Workers, backed by PlanetScale Postgres via Hyperdrive.

```
apps/collector/    Worker: OTLP/HTTP ingest → Queue → batch insert; hourly partition cron
packages/otlp/     OTLP protobuf/JSON decoding (generated from opentelemetry-proto v1.11.1) and row flattening
packages/db/       TelemetryStore service (@effect/sql-pg) and SQL migrations
alchemy.run.ts     Stack: PlanetScale DB + role, Hyperdrive, Queues, Worker, ingest token
```

## Setup

```sh
pnpm install
pnpm exec alchemy profile edit --add Cloudflare
pnpm exec alchemy profile edit --add Planetscale
pnpm deploy
```

The deploy outputs `collectorUrl` and `ingestToken`.

## Exporting to the collector

```sh
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=<collectorUrl>
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <ingestToken>"
```

Endpoints: `POST /v1/traces`, `POST /v1/logs`. Accepts `application/x-protobuf` and `application/json`, optionally gzip-encoded.

## Regenerating protobuf code

```sh
pnpm generate
```

## Storage

`spans` and `logs` are range-partitioned by day. An hourly cron creates partitions 3 days ahead and drops partitions older than 14 days (`RETENTION_DAYS` in `apps/collector/src/Collector.ts`). Rows landing outside a daily partition go to `*_default` and are moved into the right partition when it's created.
