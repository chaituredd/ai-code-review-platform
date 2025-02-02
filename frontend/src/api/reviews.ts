import api from "./client";
import type {
  AISuggestion,
  Annotation,
  CodeFile,
  CodeFileListItem,
  Comment,
  PaginatedResponse,
  Repository,
  ReviewSession,
} from "@/types";

export const reviewsApi = {
  // ── Repositories ─────────────────────────────
  listRepositories: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Repository>>("/api/reviews/repositories/", { params }),

  getRepository: (id: string) =>
    api.get<Repository>(`/api/reviews/repositories/${id}/`),

  createRepository: (data: { name: string; description?: string; language?: string }) =>
    api.post<Repository>("/api/reviews/repositories/", data),

  updateRepository: (id: string, data: Partial<Repository>) =>
    api.patch<Repository>(`/api/reviews/repositories/${id}/`, data),

  deleteRepository: (id: string) =>
    api.delete(`/api/reviews/repositories/${id}/`),

  // ── Code Files ───────────────────────────────
  listFiles: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<CodeFileListItem>>("/api/reviews/files/", { params }),

  getFile: (id: string) =>
    api.get<CodeFile>(`/api/reviews/files/${id}/`),

  uploadFile: (data: { repository: string; path: string; content: string; language?: string }) =>
    api.post<CodeFile>("/api/reviews/files/", data),

  // ── Review Sessions ──────────────────────────
  listSessions: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<ReviewSession>>("/api/reviews/sessions/", { params }),

  getSession: (id: string) =>
    api.get<ReviewSession>(`/api/reviews/sessions/${id}/`),

  createSession: (data: {
    title: string;
    description?: string;
    repository: string;
    reviewer_ids?: number[];
    file_ids?: string[];
  }) => api.post<ReviewSession>("/api/reviews/sessions/", data),

  updateSession: (id: string, data: Partial<ReviewSession>) =>
    api.patch<ReviewSession>(`/api/reviews/sessions/${id}/`, data),

  // ── Annotations ──────────────────────────────
  listAnnotations: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Annotation>>("/api/reviews/annotations/", { params }),

  createAnnotation: (data: {
    session: string;
    file: string;
    start_line: number;
    end_line: number;
  }) => api.post<Annotation>("/api/reviews/annotations/", data),

  updateAnnotation: (id: string, data: Partial<Annotation>) =>
    api.patch<Annotation>(`/api/reviews/annotations/${id}/`, data),

  // ── Comments ─────────────────────────────────
  createComment: (data: { annotation: string; body: string }) =>
    api.post<Comment>("/api/reviews/comments/", data),

  // ── AI Suggestions ───────────────────────────
  listSuggestions: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<AISuggestion>>("/api/reviews/suggestions/", { params }),

  requestSuggestion: (data: {
    session_id: string;
    file_id: string;
    start_line: number;
    end_line: number;
  }) => api.post<{ task_id: string; status: string }>("/api/reviews/suggestions/generate/", data),

  acceptSuggestion: (id: string) =>
    api.patch<AISuggestion>(`/api/reviews/suggestions/${id}/accept/`),
};
