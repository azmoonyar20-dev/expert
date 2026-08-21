CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS _migrlog;
CREATE TABLE IF NOT EXISTS _migrlog.errors (n int, file text, sqlstate text, msg text, stmt text);
TRUNCATE _migrlog.errors;

DO $$
DECLARE
  sql_text text;
  resp extensions.http_response;
BEGIN
  SELECT * INTO resp FROM extensions.http_get('https://id-preview--acae72e2-4095-4e22-8825-2c287b98fdad.lovable.app/__l5e/assets-v1/8713e4a3-b825-4907-a394-e9125ee72980/bundle5.sql.txt');
  IF resp.status <> 200 THEN
    RAISE EXCEPTION 'bundle fetch failed with status %', resp.status;
  END IF;
  sql_text := resp.content;
  IF length(sql_text) < 900000 THEN
    RAISE EXCEPTION 'bundle too short: % bytes', length(sql_text);
  END IF;
  EXECUTE sql_text;
END $$;