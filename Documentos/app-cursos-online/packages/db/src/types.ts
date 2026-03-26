// ─── Shared TypeScript types for CourseForge AI ───────────────────────────
// These types mirror the Prisma models in backend/prisma/schema.prisma.
// Used by both backend and frontend for type safety.

// ─── Enums ────────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'CREATOR' | 'STUDENT' | 'MODERATOR';
export type CourseStatus = 'DRAFT' | 'GENERATING' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
export type ModuleStatus = 'PENDING' | 'GENERATING' | 'DONE' | 'FAILED';
export type VideoJobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED' | 'REVIEW' | 'APPROVED';
export type VoiceMode = 'CLONE' | 'TTS_GENERIC';
export type AvatarProvider = 'HEYGEN' | 'DID';
export type SlideStyle = 'MINIMAL' | 'BRANDED' | 'DARK';
export type PublicationStatus = 'PENDING' | 'PARTIAL' | 'DONE' | 'FAILED';
export type AgentScope = 'GLOBAL' | 'CATEGORY' | 'COURSE';
export type AgentType = 'SALES' | 'SUPPORT' | 'TUTOR' | 'FOLLOWUP';
export type AgentTone = 'FORMAL' | 'CASUAL' | 'FRIENDLY';
export type ChatMessageRole = 'USER' | 'ASSISTANT';
export type DiscountType = 'PCT' | 'FIXED';
export type HeatmapEventType = 'PLAY' | 'PAUSE' | 'SEEK' | 'EXIT';

// ─── Row types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatorProfile {
  user_id: string;
  bio: string | null;
  voice_clone_id: string | null;
  avatar_config: Record<string, unknown> | null;
  stripe_account_id: string | null;
}

export interface StudentProfile {
  user_id: string;
  timezone: string | null;
  preferred_language: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  creator_id: string;
  category_id: string;
  slug: string;
  title: string;
  description_short: string | null;
  description_long: string | null;
  status: CourseStatus;
  price_cents: number;
  currency: string;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  generation_config: Record<string, unknown> | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  order: number;
  title: string;
  duration_seconds: number | null;
  video_url: string | null;
  script: string | null;
  status: ModuleStatus;
}

export interface VideoJob {
  id: string;
  course_id: string;
  module_id: string;
  status: VideoJobStatus;
  config: Record<string, unknown> | null;
  assets: Record<string, unknown> | null;
  assembled_url: string | null;
  error_log: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerationConfig {
  id: string;
  course_id: string;
  voice_mode: VoiceMode;
  voice_id: string | null;
  avatar_enabled: boolean;
  avatar_provider: AvatarProvider | null;
  avatar_id: string | null;
  slide_style: SlideStyle;
  background_music: boolean;
  language: string;
  target_duration_per_module_min: number | null;
  thumbnail_style: string | null;
}

export interface Purchase {
  id: string;
  student_id: string;
  course_id: string;
  amount_cents: number;
  currency: string;
  stripe_payment_id: string | null;
  wompi_id: string | null;
  purchased_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  certificate_url: string | null;
}

export interface ModuleProgress {
  student_id: string;
  module_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string | null;
}

export interface AgentConfig {
  id: string;
  scope: AgentScope;
  scope_id: string | null;
  agent_type: AgentType;
  name: string;
  personality: string | null;
  tone: AgentTone;
  languages: string[] | null;
  active: boolean;
}

export interface Certificate {
  id: string;
  enrollment_id: string;
  code: string;
  issued_at: string;
  template_id: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
}

export interface AffiliateLink {
  id: string;
  user_id: string;
  course_id: string;
  code: string;
  commission_pct: number;
  clicks: number;
  conversions: number;
}

// ─── Paginated response ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
