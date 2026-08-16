-- Adds 'homework' to the notification type enum so the bell can show a
-- distinct icon for it rather than mislabelling it as an announcement.
--
-- Safe to re-run: IF NOT EXISTS is a no-op when the value is already present.
-- Postgres 12+ permits this inside a transaction block, provided the new value
-- is not USED until after commit — which is why no insert happens here.

ALTER TYPE "type" ADD VALUE IF NOT EXISTS 'homework';
