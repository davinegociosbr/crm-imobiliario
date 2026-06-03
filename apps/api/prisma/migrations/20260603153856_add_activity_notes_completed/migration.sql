-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;
