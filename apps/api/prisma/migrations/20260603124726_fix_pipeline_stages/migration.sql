/*
  Warnings:

  - The values [QUALIFICATION,NEGOTIATION,CONTRACT_SIGNING] on the enum `PipelineStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PipelineStage_new" AS ENUM ('INITIAL_CONTACT', 'REDIRECT', 'ATTENDANCE', 'TODAY', 'FOLLOW_UP', 'CLIENTS', 'INACTIVE');
ALTER TABLE "leads" ALTER COLUMN "pipelineStage" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "pipelineStage" TYPE "PipelineStage_new" USING ("pipelineStage"::text::"PipelineStage_new");
ALTER TYPE "PipelineStage" RENAME TO "PipelineStage_old";
ALTER TYPE "PipelineStage_new" RENAME TO "PipelineStage";
DROP TYPE "PipelineStage_old";
ALTER TABLE "leads" ALTER COLUMN "pipelineStage" SET DEFAULT 'INITIAL_CONTACT';
COMMIT;
