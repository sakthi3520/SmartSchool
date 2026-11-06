// ============================================================
// SmartSchool Shared TypeScript Types
// ============================================================

export type Role = "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}
