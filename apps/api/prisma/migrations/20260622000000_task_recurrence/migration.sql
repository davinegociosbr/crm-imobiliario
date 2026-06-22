CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "tasks"
  ADD COLUMN "recurrenceType" "RecurrenceType",
  ADD COLUMN "recurrenceDays" INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN "recurrenceEnd"  TIMESTAMP(3),
  ADD COLUMN "parentTaskId"   TEXT;
