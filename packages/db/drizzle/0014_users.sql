-- 0014_users.sql
-- Creates the users identity table.
-- V1: single default row. V2: one row per Privy user.

CREATE TABLE IF NOT EXISTS "users" (
  "id"             varchar(36)  PRIMARY KEY,
  "email"          varchar(255),
  "wallet_address" varchar(42),
  "display_name"   varchar(100),
  "privy_id"       varchar(255),
  "created_at"     timestamp    DEFAULT now() NOT NULL,
  "updated_at"     timestamp    DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx"     ON "users" ("email")         WHERE "email"          IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_wallet_idx"    ON "users" ("wallet_address") WHERE "wallet_address"  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_privy_id_idx"  ON "users" ("privy_id")       WHERE "privy_id"        IS NOT NULL;
