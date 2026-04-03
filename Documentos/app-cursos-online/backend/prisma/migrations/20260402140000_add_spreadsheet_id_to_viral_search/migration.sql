-- Add spreadsheet_id to viral_searches for Google Sheets export history
ALTER TABLE "viral_searches" ADD COLUMN IF NOT EXISTS "spreadsheet_id" TEXT;
