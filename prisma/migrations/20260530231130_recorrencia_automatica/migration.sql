-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "weekday" INTEGER,
ALTER COLUMN "due_day" DROP NOT NULL;
