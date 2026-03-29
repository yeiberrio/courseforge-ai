-- Add advanced viral filter fields to viral_searches
ALTER TABLE "viral_searches" ADD COLUMN IF NOT EXISTS "min_comments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "viral_searches" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "viral_searches" ADD COLUMN IF NOT EXISTS "countries" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "viral_searches" ADD COLUMN IF NOT EXISTS "event_type" TEXT;
ALTER TABLE "viral_searches" ADD COLUMN IF NOT EXISTS "sort_by" TEXT NOT NULL DEFAULT 'viewCount';
