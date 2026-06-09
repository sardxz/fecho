-- CreateEnum
CREATE TYPE "PlanCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mp_preapproval_id" TEXT,
ADD COLUMN     "plan_cycle" "PlanCycle",
ADD COLUMN     "plan_renews_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_mp_preapproval_id_key" ON "users"("mp_preapproval_id");
