export type UserRole = "ADMIN" | "CREATOR" | "STUDENT" | "MODERATOR";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  children?: Category[];
  _count?: { courses: number };
}

export type CourseStatus = "DRAFT" | "GENERATING" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

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
  published_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: { id: string; full_name: string; avatar_url: string | null };
  category?: { id: string; name: string; slug: string };
  modules?: CourseModule[];
  _count?: { modules: number; enrollments: number };
}

export type ModuleStatus = "PENDING" | "GENERATING" | "DONE" | "FAILED";

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

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  course?: Partial<Course>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
