-- CreateEnum
CREATE TYPE "YouTubePrivacy" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "YouTubePublicationStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ViralCategory" AS ENUM ('RELIGIOUS', 'EDUCATIONAL', 'NEWS');

-- CreateEnum
CREATE TYPE "ViralTranscriptionStatus" AS ENUM ('NONE', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ViralProcessingStatus" AS ENUM ('PENDING', 'TRANSCRIBING', 'PROCESSING', 'READY', 'USED');

-- CreateEnum
CREATE TYPE "ContentLength" AS ENUM ('EXTENSIVE', 'MEDIUM', 'REDUCED', 'MICRO');

-- CreateEnum
CREATE TYPE "KBSourceType" AS ENUM ('COURSE', 'VIRAL_CONTENT', 'MANUAL_UPLOAD');

-- CreateTable
CREATE TABLE "youtube_channels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_title" TEXT,
    "channel_thumbnail" TEXT,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expiry" TIMESTAMP(3),
    "scopes" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "youtube_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_publications" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "module_id" TEXT,
    "channel_id" TEXT NOT NULL,
    "youtube_video_id" TEXT,
    "youtube_url" TEXT,
    "privacy" "YouTubePrivacy" NOT NULL DEFAULT 'UNLISTED',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "playlist_id" TEXT,
    "status" "YouTubePublicationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "analytics" JSONB,
    "error_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viral_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "ViralCategory" NOT NULL,
    "keywords" TEXT[],
    "min_views" INTEGER NOT NULL DEFAULT 100000,
    "min_likes" INTEGER NOT NULL DEFAULT 5000,
    "date_range" TEXT NOT NULL DEFAULT '30d',
    "language" TEXT NOT NULL DEFAULT 'es',
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viral_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viral_videos" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "title" TEXT,
    "channel_name" TEXT,
    "channel_id" TEXT,
    "thumbnail_url" TEXT,
    "view_count" BIGINT NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "category" "ViralCategory" NOT NULL,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "transcription_status" "ViralTranscriptionStatus" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viral_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viral_content_processing" (
    "id" TEXT NOT NULL,
    "viral_video_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "raw_transcription" TEXT,
    "processed_content" TEXT,
    "content_length" "ContentLength" NOT NULL DEFAULT 'MEDIUM',
    "target_duration_minutes" INTEGER,
    "topics_extracted" JSONB,
    "key_facts" JSONB,
    "generated_document" JSONB,
    "status" "ViralProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "course_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viral_content_processing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_documents" (
    "id" TEXT NOT NULL,
    "course_id" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "file_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "page_count" INTEGER,
    "chunk_count" INTEGER,
    "source_type" "KBSourceType" NOT NULL DEFAULT 'COURSE',
    "viral_video_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ingested_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "youtube_channels_user_id_idx" ON "youtube_channels"("user_id");

-- CreateIndex
CREATE INDEX "youtube_publications_course_id_idx" ON "youtube_publications"("course_id");

-- CreateIndex
CREATE INDEX "youtube_publications_channel_id_idx" ON "youtube_publications"("channel_id");

-- CreateIndex
CREATE INDEX "viral_searches_user_id_idx" ON "viral_searches"("user_id");

-- CreateIndex
CREATE INDEX "viral_videos_search_id_idx" ON "viral_videos"("search_id");

-- CreateIndex
CREATE INDEX "viral_videos_youtube_video_id_idx" ON "viral_videos"("youtube_video_id");

-- CreateIndex
CREATE INDEX "viral_content_processing_viral_video_id_idx" ON "viral_content_processing"("viral_video_id");

-- CreateIndex
CREATE INDEX "viral_content_processing_user_id_idx" ON "viral_content_processing"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_base_documents_course_id_idx" ON "knowledge_base_documents"("course_id");

-- CreateIndex
CREATE INDEX "knowledge_base_documents_source_type_idx" ON "knowledge_base_documents"("source_type");

-- AddForeignKey
ALTER TABLE "youtube_channels" ADD CONSTRAINT "youtube_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_publications" ADD CONSTRAINT "youtube_publications_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_publications" ADD CONSTRAINT "youtube_publications_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "youtube_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viral_searches" ADD CONSTRAINT "viral_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viral_videos" ADD CONSTRAINT "viral_videos_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "viral_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viral_content_processing" ADD CONSTRAINT "viral_content_processing_viral_video_id_fkey" FOREIGN KEY ("viral_video_id") REFERENCES "viral_videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viral_content_processing" ADD CONSTRAINT "viral_content_processing_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viral_content_processing" ADD CONSTRAINT "viral_content_processing_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_documents" ADD CONSTRAINT "knowledge_base_documents_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
