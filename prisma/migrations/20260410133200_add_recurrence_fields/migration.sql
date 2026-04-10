-- AlterTable
ALTER TABLE "Task" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_recurrence_at" TIMESTAMP(3),
ADD COLUMN "next_recurrence_at" TIMESTAMP(3),
ADD COLUMN "recurrence_config" JSONB;
