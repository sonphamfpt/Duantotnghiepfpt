ALTER TABLE "services" ALTER COLUMN "buffer_minutes" SET DEFAULT 0;

UPDATE "services"
SET "buffer_minutes" = 0;
