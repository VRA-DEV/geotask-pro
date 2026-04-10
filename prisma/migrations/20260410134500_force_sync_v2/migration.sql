-- AlterTable User (Hierarchy)
ALTER TABLE "User" ADD COLUMN "manager_id" INTEGER;
ALTER TABLE "User" ADD CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_manager_id_idx" ON "User"("manager_id");

-- AlterTable Task (Recurrence)
ALTER TABLE "Task" ADD COLUMN "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_recurrence_at" TIMESTAMP(3),
ADD COLUMN "next_recurrence_at" TIMESTAMP(3),
ADD COLUMN "recurrence_config" JSONB;

-- CreateTable Gaming
CREATE TABLE "Gaming" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "evaluator_id" INTEGER,
    "cycle_type" TEXT NOT NULL,
    "cycle_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "Gaming_pkey" PRIMARY KEY ("id")
);

-- CreateTable GamingItem
CREATE TABLE "GamingItem" (
    "id" SERIAL NOT NULL,
    "gaming_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "achieved" DOUBLE PRECISION,

    CONSTRAINT "GamingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable GamingHistory
CREATE TABLE "GamingHistory" (
    "id" SERIAL NOT NULL,
    "gaming_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable GamingSnapshot
CREATE TABLE "GamingSnapshot" (
    "id" SERIAL NOT NULL,
    "gaming_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamingSnapshot_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys & Indexes
ALTER TABLE "Gaming" ADD CONSTRAINT "Gaming_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gaming" ADD CONSTRAINT "Gaming_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GamingItem" ADD CONSTRAINT "GamingItem_gaming_id_fkey" FOREIGN KEY ("gaming_id") REFERENCES "Gaming"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GamingHistory" ADD CONSTRAINT "GamingHistory_gaming_id_fkey" FOREIGN KEY ("gaming_id") REFERENCES "Gaming"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GamingHistory" ADD CONSTRAINT "GamingHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GamingSnapshot" ADD CONSTRAINT "GamingSnapshot_gaming_id_fkey" FOREIGN KEY ("gaming_id") REFERENCES "Gaming"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Gaming_user_id_idx" ON "Gaming"("user_id");
CREATE INDEX "Gaming_evaluator_id_idx" ON "Gaming"("evaluator_id");
CREATE INDEX "Gaming_status_idx" ON "Gaming"("status");
CREATE INDEX "GamingItem_gaming_id_idx" ON "GamingItem"("gaming_id");
CREATE INDEX "GamingHistory_gaming_id_idx" ON "GamingHistory"("gaming_id");
CREATE INDEX "GamingSnapshot_gaming_id_idx" ON "GamingSnapshot"("gaming_id");
