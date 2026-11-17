CREATE TABLE spans (
  trace_id             text        NOT NULL,
  span_id              text        NOT NULL,
  parent_span_id       text,
  trace_state          text        NOT NULL DEFAULT '',
  name                 text        NOT NULL,
  kind                 smallint    NOT NULL,
  start_time           timestamptz NOT NULL,
  end_time             timestamptz NOT NULL,
  start_time_unix_nano bigint      NOT NULL,
  duration_ns          bigint      NOT NULL,
  status_code          smallint    NOT NULL,
  status_message       text        NOT NULL DEFAULT '',
  flags                integer     NOT NULL DEFAULT 0,
  service_name         text        NOT NULL,
  scope_name           text        NOT NULL DEFAULT '',
  scope_version        text        NOT NULL DEFAULT '',
  resource_attributes  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  attributes           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  events               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  links                jsonb       NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (trace_id, span_id, start_time)
) PARTITION BY RANGE (start_time);

CREATE INDEX spans_service_time_idx ON spans (service_name, start_time DESC);
CREATE INDEX spans_time_idx ON spans (start_time DESC);
CREATE INDEX spans_trace_idx ON spans (trace_id);

CREATE TABLE logs (
  id                  uuid        NOT NULL,
  time                timestamptz NOT NULL,
  time_unix_nano      bigint      NOT NULL,
  observed_time       timestamptz NOT NULL,
  severity_number     smallint    NOT NULL,
  severity_text       text        NOT NULL DEFAULT '',
  body                text,
  trace_id            text,
  span_id             text,
  flags               integer     NOT NULL DEFAULT 0,
  event_name          text        NOT NULL DEFAULT '',
  service_name        text        NOT NULL,
  scope_name          text        NOT NULL DEFAULT '',
  scope_version       text        NOT NULL DEFAULT '',
  resource_attributes jsonb       NOT NULL DEFAULT '{}'::jsonb,
  attributes          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, time)
) PARTITION BY RANGE (time);

CREATE INDEX logs_service_time_idx ON logs (service_name, time DESC);
CREATE INDEX logs_time_idx ON logs (time DESC);
CREATE INDEX logs_trace_idx ON logs (trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX logs_severity_time_idx ON logs (severity_number, time DESC);

CREATE TABLE spans_default PARTITION OF spans DEFAULT;
CREATE TABLE logs_default PARTITION OF logs DEFAULT;

CREATE FUNCTION telemetry_ensure_partitions(days_ahead integer)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target record;
  target_day date;
  partition_name text;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES ('spans', 'start_time'), ('logs', 'time')) AS t(parent, time_column)
  LOOP
    FOR offset_days IN 0..days_ahead LOOP
      target_day := current_date + offset_days;
      partition_name := format('%s_%s', target.parent, to_char(target_day, 'YYYYMMDD'));
      CONTINUE WHEN to_regclass(partition_name) IS NOT NULL;

      EXECUTE format('CREATE TABLE %I (LIKE %I INCLUDING DEFAULTS)', partition_name, target.parent);
      EXECUTE format(
        'WITH moved AS (DELETE FROM %I WHERE %I >= %L AND %I < %L RETURNING *) INSERT INTO %I SELECT * FROM moved',
        target.parent || '_default', target.time_column, target_day::timestamptz,
        target.time_column, (target_day + 1)::timestamptz, partition_name
      );
      EXECUTE format(
        'ALTER TABLE %I ATTACH PARTITION %I FOR VALUES FROM (%L) TO (%L)',
        target.parent, partition_name, target_day::timestamptz, (target_day + 1)::timestamptz
      );
    END LOOP;
  END LOOP;
END;
$$;

CREATE FUNCTION telemetry_drop_partitions(retention_days integer)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  child record;
  cutoff date := current_date - retention_days;
  dropped integer := 0;
BEGIN
  FOR child IN
    SELECT c.relname AS name
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE p.relname IN ('spans', 'logs')
      AND c.relname ~ '_[0-9]{8}$'
      AND right(c.relname, 8) < to_char(cutoff, 'YYYYMMDD')
  LOOP
    EXECUTE format('DROP TABLE %I', child.name);
    dropped := dropped + 1;
  END LOOP;

  DELETE FROM spans_default WHERE start_time < cutoff::timestamptz;
  DELETE FROM logs_default WHERE time < cutoff::timestamptz;

  RETURN dropped;
END;
$$;

SELECT telemetry_ensure_partitions(3);
