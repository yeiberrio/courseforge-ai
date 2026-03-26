import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum schemas (reusable)
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['admin', 'creator', 'student', 'moderator']);
export const CourseStatusSchema = z.enum(['draft', 'generating', 'review', 'approved', 'published', 'archived']);
export const ModuleStatusSchema = z.enum(['pending', 'generating', 'done', 'failed']);
export const VideoJobStatusSchema = z.enum(['queued', 'processing', 'done', 'failed', 'review', 'approved']);
export const VoiceModeSchema = z.enum(['clone', 'tts_generic']);
export const AvatarProviderSchema = z.enum(['heygen', 'did']).nullable();
export const SlideStyleSchema = z.enum(['minimal', 'branded', 'dark']);
export const PublicationStatusSchema = z.enum(['pending', 'partial', 'done', 'failed']);
export const AgentScopeSchema = z.enum(['global', 'category', 'course']);
export const AgentTypeSchema = z.enum(['sales', 'support', 'tutor', 'followup']);
export const AgentToneSchema = z.enum(['formal', 'casual', 'friendly']);
export const ChatMessageRoleSchema = z.enum(['user', 'assistant']);
export const DiscountTypeSchema = z.enum(['pct', 'fixed']);
export const HeatmapEventTypeSchema = z.enum(['play', 'pause', 'seek', 'exit']);

// ---------------------------------------------------------------------------
// User schemas
// ---------------------------------------------------------------------------

export const CreateUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(120),
  avatar_url: z.string().url().nullable().optional(),
  role: UserRoleSchema.optional().default('student'),
});

export const UpdateUserSchema = CreateUserSchema.partial();

// ---------------------------------------------------------------------------
// Creator profile
// ---------------------------------------------------------------------------

export const UpdateCreatorProfileSchema = z.object({
  bio: z.string().max(2000).nullable().optional(),
  voice_clone_id: z.string().nullable().optional(),
  avatar_config: z.record(z.unknown()).nullable().optional(),
  stripe_account_id: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Student profile
// ---------------------------------------------------------------------------

export const UpdateStudentProfileSchema = z.object({
  timezone: z.string().max(50).nullable().optional(),
  preferred_language: z.string().max(10).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const CreateCategorySchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  agent_config_id: z.string().uuid().nullable().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

export const CreateCourseSchema = z.object({
  title: z.string().min(5).max(120),
  category_id: z.string().uuid(),
  slug: z.string().min(3).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description_short: z.string().max(300).nullable().optional(),
  description_long: z.string().max(10000).nullable().optional(),
  price_cents: z.number().int().min(0),
  currency: z.string().length(3).default('USD'),
  thumbnail_url: z.string().url().nullable().optional(),
  preview_video_url: z.string().url().nullable().optional(),
  seo_title: z.string().max(70).nullable().optional(),
  seo_description: z.string().max(160).nullable().optional(),
  seo_keywords: z.string().max(500).nullable().optional(),
});

export const UpdateCourseSchema = CreateCourseSchema.partial().extend({
  status: CourseStatusSchema.optional(),
});

// ---------------------------------------------------------------------------
// Course module
// ---------------------------------------------------------------------------

export const CreateCourseModuleSchema = z.object({
  course_id: z.string().uuid(),
  order: z.number().int().min(1),
  title: z.string().min(3).max(200),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  video_url: z.string().url().nullable().optional(),
  script: z.string().nullable().optional(),
  status: ModuleStatusSchema.optional().default('pending'),
});

export const UpdateCourseModuleSchema = CreateCourseModuleSchema.partial();

// ---------------------------------------------------------------------------
// Generation config
// ---------------------------------------------------------------------------

export const CreateGenerationConfigSchema = z.object({
  course_id: z.string().uuid(),
  voice_mode: VoiceModeSchema.default('tts_generic'),
  voice_id: z.string().nullable().optional(),
  avatar_enabled: z.boolean().default(false),
  avatar_provider: AvatarProviderSchema.optional(),
  avatar_id: z.string().nullable().optional(),
  slide_style: SlideStyleSchema.default('minimal'),
  background_music: z.boolean().default(false),
  language: z.string().min(2).max(10).default('es'),
  target_duration_per_module_min: z.number().int().min(1).max(60).nullable().optional(),
  thumbnail_style: z.string().max(50).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

export const CreatePurchaseSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
  amount_cents: z.number().int().min(0),
  currency: z.string().length(3).default('USD'),
  stripe_payment_id: z.string().nullable().optional(),
  wompi_id: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export const CreateEnrollmentSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Module progress
// ---------------------------------------------------------------------------

export const UpsertModuleProgressSchema = z.object({
  student_id: z.string().uuid(),
  module_id: z.string().uuid(),
  watched_seconds: z.number().int().min(0),
  completed: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Agent config
// ---------------------------------------------------------------------------

export const CreateAgentConfigSchema = z.object({
  scope: AgentScopeSchema.default('global'),
  scope_id: z.string().uuid().nullable().optional(),
  agent_type: AgentTypeSchema,
  name: z.string().min(2).max(100),
  personality: z.string().max(2000).nullable().optional(),
  tone: AgentToneSchema.default('friendly'),
  languages: z.array(z.string()).nullable().optional(),
  rag_documents: z.array(z.string().uuid()).nullable().optional(),
  escalation_rules: z.record(z.unknown()).nullable().optional(),
  active: z.boolean().default(true),
});

export const UpdateAgentConfigSchema = CreateAgentConfigSchema.partial();

// ---------------------------------------------------------------------------
// Chat message
// ---------------------------------------------------------------------------

export const CreateChatMessageSchema = z.object({
  session_id: z.string().uuid(),
  role: ChatMessageRoleSchema,
  content: z.string().min(1).max(10000),
});

// ---------------------------------------------------------------------------
// Affiliate link
// ---------------------------------------------------------------------------

export const CreateAffiliateLinkSchema = z.object({
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  code: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  commission_pct: z.number().min(0).max(100).default(30),
});

// ---------------------------------------------------------------------------
// Coupon
// ---------------------------------------------------------------------------

export const CreateCouponSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/),
  discount_type: DiscountTypeSchema,
  discount_value: z.number().min(0),
  max_uses: z.number().int().min(1).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const UpdateCouponSchema = CreateCouponSchema.partial();

// ---------------------------------------------------------------------------
// Email subscriber
// ---------------------------------------------------------------------------

export const CreateEmailSubscriberSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).nullable().optional(),
  source: z.string().max(50).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Certificate
// ---------------------------------------------------------------------------

export const CreateCertificateSchema = z.object({
  enrollment_id: z.string().uuid(),
  code: z.string().min(6).max(50),
  template_id: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Video heatmap event
// ---------------------------------------------------------------------------

export const CreateVideoHeatmapEventSchema = z.object({
  module_id: z.string().uuid(),
  student_id: z.string().uuid(),
  second: z.number().int().min(0),
  event_type: HeatmapEventTypeSchema,
});

// ---------------------------------------------------------------------------
// Type inference helpers
// ---------------------------------------------------------------------------

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;
export type CreateCourse = z.infer<typeof CreateCourseSchema>;
export type UpdateCourse = z.infer<typeof UpdateCourseSchema>;
export type CreateCourseModule = z.infer<typeof CreateCourseModuleSchema>;
export type UpdateCourseModule = z.infer<typeof UpdateCourseModuleSchema>;
export type CreateGenerationConfig = z.infer<typeof CreateGenerationConfigSchema>;
export type CreatePurchase = z.infer<typeof CreatePurchaseSchema>;
export type CreateEnrollment = z.infer<typeof CreateEnrollmentSchema>;
export type UpsertModuleProgress = z.infer<typeof UpsertModuleProgressSchema>;
export type CreateAgentConfig = z.infer<typeof CreateAgentConfigSchema>;
export type UpdateAgentConfig = z.infer<typeof UpdateAgentConfigSchema>;
export type CreateChatMessage = z.infer<typeof CreateChatMessageSchema>;
export type CreateAffiliateLink = z.infer<typeof CreateAffiliateLinkSchema>;
export type CreateCoupon = z.infer<typeof CreateCouponSchema>;
export type UpdateCoupon = z.infer<typeof UpdateCouponSchema>;
export type CreateEmailSubscriber = z.infer<typeof CreateEmailSubscriberSchema>;
export type CreateCertificate = z.infer<typeof CreateCertificateSchema>;
export type CreateVideoHeatmapEvent = z.infer<typeof CreateVideoHeatmapEventSchema>;
