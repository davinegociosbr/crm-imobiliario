-- Change pipelineStage from enum to String (TEXT)
ALTER TABLE "leads" ALTER COLUMN "pipelineStage" TYPE TEXT USING "pipelineStage"::TEXT;
ALTER TABLE "leads" ALTER COLUMN "pipelineStage" SET DEFAULT 'INITIAL_CONTACT';

-- Drop enum (no longer needed)
DROP TYPE IF EXISTS "PipelineStage";
